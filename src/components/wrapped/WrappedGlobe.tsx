'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { gcInterpolate, gcBearing, easeInOutCubic } from '@/lib/utils/geoCalculations'

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400" />
    </div>
  ),
})

interface WrappedLocation {
  lat: number
  lng: number
  name: string
  date: string
  albumId?: string
}

interface FlightArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  name: string
  distance: number
  index: number
  total: number
}

/**
 * State of the airplane HTML marker that flies along the active arc.
 * Held in a ref and MUTATED in place every animation frame — three-globe
 * diffs htmlElementsData by object identity, so keeping the same object
 * means the DOM element is created once and only repositioned afterwards
 * (instead of being torn down and rebuilt 60 times a second).
 */
interface PlaneDatum {
  lat: number
  lng: number
  altitude: number
  /** Compass bearing in degrees (0 = north). Used to rotate the SVG. */
  bearing: number
  /** Cached DOM node so the rAF loop can rotate it directly. */
  el?: HTMLDivElement
}

interface WrappedGlobeProps {
  locations: WrappedLocation[]
  animate?: boolean
  onAnimationComplete?: () => void
  onProgress?: (progress: number, segmentIndex: number) => void
  onPinClick?: (location: WrappedLocation) => void
  className?: string
}

/* ───────────────────────────────────────────────────────────────────────
 * Arc visual tuning (the spherical math itself lives in geoCalculations)
 * ─────────────────────────────────────────────────────────────────────── */

/** Same eased curve used for the arc rendering, so the plane rides the
 *  visual arc instead of skimming the surface. Peaks at t=0.5. */
function arcAltitude(t: number, peak: number): number {
  return 4 * t * (1 - t) * peak
}

/** Match the existing arcAltitude formula on the visible arc lines so the
 *  plane stays on top of its arc rather than under it. */
function peakAltitudeFor(distance: number): number {
  return 0.12 + Math.min(distance / 120, 1) * 0.3
}

export function WrappedGlobe({
  locations,
  animate = true,
  onAnimationComplete,
  onProgress,
  onPinClick,
  className = '',
}: WrappedGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [revealedArcs, setRevealedArcs] = useState<number>(animate ? 0 : 999)
  const [currentSegment, setCurrentSegment] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Plane marker — single mutable datum (see PlaneDatum docs). planeFrame
  // is a render counter: -1 = hidden, each increment hands three-globe a
  // fresh array wrapping the SAME object so it repositions without
  // recreating the element.
  const planeRef = useRef<PlaneDatum>({ lat: 0, lng: 0, altitude: 0, bearing: 0 })
  const [planeFrame, setPlaneFrame] = useState(-1)

  // Client-only mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Measure container dimensions
  useEffect(() => {
    if (!mounted) return

    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
        }
      }
    }

    // Measure immediately and after a short delay (for layout settling)
    measure()
    const t1 = setTimeout(measure, 100)
    const t2 = setTimeout(measure, 500)

    // Also listen to window resize
    window.addEventListener('resize', measure)

    // ResizeObserver for container size changes
    let ro: ResizeObserver | null = null
    if (containerRef.current) {
      ro = new ResizeObserver(() => measure())
      ro.observe(containerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [mounted])

  // Chronological order drives everything: arcs, pin reveal, camera start.
  const sortedLocations = useMemo(
    () =>
      [...locations].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [locations]
  )

  // Build arcs from sorted locations
  const arcs: FlightArc[] = useMemo(() => {
    if (sortedLocations.length < 2) return []
    const paths: FlightArc[] = []
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const from = sortedLocations[i]
      const to = sortedLocations[i + 1]
      const dLat = to.lat - from.lat
      // Normalize longitude delta into [-180, 180] so an antimeridian crossing
      // (e.g. Tokyo → LA) measures the short way — matching the great-circle
      // arc that's actually rendered — instead of ballooning the camera zoom.
      let dLng = to.lng - from.lng
      if (dLng > 180) dLng -= 360
      else if (dLng < -180) dLng += 360
      const distance = Math.sqrt(dLat * dLat + dLng * dLng)
      paths.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        name: `${from.name} → ${to.name}`,
        distance,
        index: i,
        total: sortedLocations.length - 1,
      })
    }
    return paths
  }, [sortedLocations])

  // Pin data: show all locations when not animating, progressive when animating
  const pointsData = useMemo(() => {
    if (sortedLocations.length === 0) return []
    const count = animate
      ? Math.min(revealedArcs + 1, sortedLocations.length)
      : sortedLocations.length
    return sortedLocations.slice(0, count).map((loc) => ({
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      size: 1.2,
      color: '#ff6b35',
    }))
  }, [sortedLocations, revealedArcs, animate])

  // Rings around current/latest destination
  const ringsData = useMemo(() => {
    if (pointsData.length === 0) return []
    const latest = pointsData[pointsData.length - 1]
    return [{
      lat: latest.lat,
      lng: latest.lng,
      maxR: 4,
      propagationSpeed: 2,
      repeatPeriod: 1000,
    }]
  }, [pointsData])

  // Visible arcs
  const visibleArcs = useMemo(() => {
    if (!animate) return arcs
    return arcs.slice(0, revealedArcs)
  }, [arcs, revealedArcs, animate])

  // Init globe camera
  useEffect(() => {
    if (!globeRef.current || !globeReady) return
    const globe = globeRef.current

    // Center on first (chronological) location if available, else default view
    if (sortedLocations.length > 0) {
      const first = sortedLocations[0]
      globe.pointOfView({ lat: first.lat, lng: first.lng, altitude: 2.5 }, 0)
    } else {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0)
    }

    const controls = globe.controls()
    if (controls) {
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.5
      // Auto-rotation fights the scripted point-to-point camera, so it only
      // runs on static globes (intro/stats backgrounds). The animated globe
      // re-enables it on the finale wide shot.
      controls.autoRotate = !animate
      controls.autoRotateSpeed = 0.3
    }
  }, [globeReady, sortedLocations, animate])

  const flyTo = useCallback(
    (lat: number, lng: number, altitude: number, duration: number) => {
      if (!globeRef.current) return
      globeRef.current.pointOfView({ lat, lng, altitude }, duration)
    },
    []
  )

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as { lat: number; lng: number; name: string; date?: string }
      // Fly to the clicked pin at a close altitude
      flyTo(p.lat, p.lng, 1.2, 1200)
      // Look up the matching location and notify parent (for deep linking)
      const match = locations.find(
        (l) => Math.abs(l.lat - p.lat) < 0.0001 && Math.abs(l.lng - p.lng) < 0.0001
      )
      if (match) onPinClick?.(match)
    },
    [flyTo, locations, onPinClick]
  )

  // Start animation sequence
  useEffect(() => {
    if (!animate || !globeReady || arcs.length === 0) return

    const startTimer = setTimeout(() => {
      setCurrentSegment(0)
    }, 1500)

    return () => clearTimeout(startTimer)
  }, [animate, globeReady, arcs.length])

  // Handle one flight segment: settle the camera on the departure point with
  // the plane parked, take off, chase the plane along the great circle with
  // the camera locked on it, land, stamp the route + destination pin, pause,
  // then advance to the next segment (or pull out for the finale).
  useEffect(() => {
    if (currentSegment < 0 || currentSegment >= arcs.length) return

    const arc = arcs[currentSegment]
    const start = { lat: arc.startLat, lng: arc.startLng }
    const end = { lat: arc.endLat, lng: arc.endLng }
    const peak = peakAltitudeFor(arc.distance)
    // Camera rides above the arc's cruising altitude — close for short
    // hops, pulled out for long hauls so there's geographic context.
    const camAlt = Math.max(peak + 0.6, Math.min(2.2, arc.distance / 40))

    // Phase 1 — fly the camera to the departure point.
    const settleMs = currentSegment === 0 ? 1400 : 600
    flyTo(start.lat, start.lng, camAlt, settleMs)

    // Park the plane on the tarmac, nose pointed at the destination.
    const plane = planeRef.current
    plane.lat = start.lat
    plane.lng = start.lng
    plane.altitude = 0.01
    plane.bearing = gcBearing(start, end)
    if (plane.el) {
      plane.el.style.transform = `translate(-50%, -50%) rotate(${plane.bearing}deg)`
    }
    setPlaneFrame((f) => Math.max(0, f + 1))

    // Scale timing based on number of arcs — shorter per-segment for many locations
    const segmentDuration = arcs.length > 10 ? 2200 : arcs.length > 5 ? 3000 : 3800

    let raf = 0
    let startTime = 0
    let advanceTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const linearT = Math.min(1, (now - startTime) / segmentDuration)
      const easedT = easeInOutCubic(linearT)
      const pos = gcInterpolate(start, end, easedT)

      plane.lat = pos.lat
      plane.lng = pos.lng
      plane.altitude = arcAltitude(easedT, peak)
      // Bearing toward the destination from where the plane actually is —
      // it drifts across long great-circle routes. Hold the last heading on
      // final approach, where the bearing math degenerates.
      if (easedT < 0.99) plane.bearing = gcBearing(pos, end)
      // Cinematic breathing: peaks at cruise (t=0.5), zero at the endpoints —
      // the camera pulls out for geographic context mid-flight and dives back
      // in for the landing, while the plane grows slightly at cruise so it
      // doesn't shrink into the zoomed-out frame. Reads as takeoff → cruise →
      // final approach instead of a flat point-to-point slide.
      const breathe = Math.sin(Math.PI * easedT)
      if (plane.el) {
        plane.el.style.transform = `translate(-50%, -50%) rotate(${plane.bearing}deg) scale(${(1 + 0.35 * breathe).toFixed(3)})`
      }
      setPlaneFrame((f) => f + 1)

      // Chase cam: keep the plane centered so the journey reads point-to-point.
      globeRef.current?.pointOfView(
        { lat: pos.lat, lng: pos.lng, altitude: camAlt * (1 + 0.3 * breathe) },
        0
      )

      // Smooth overall progress; swap the destination card on final approach.
      onProgress?.(
        (currentSegment + easedT) / arcs.length,
        easedT >= 0.6 ? currentSegment : currentSegment - 1
      )

      if (linearT < 1) {
        raf = requestAnimationFrame(tick)
        return
      }

      // Landed — park the plane, stamp the flown route + destination pin.
      plane.lat = end.lat
      plane.lng = end.lng
      plane.altitude = 0.01
      setPlaneFrame((f) => f + 1)
      setRevealedArcs(currentSegment + 1)
      onProgress?.((currentSegment + 1) / arcs.length, currentSegment)

      // Brief pause on the destination, then move on.
      advanceTimer = setTimeout(() => {
        if (currentSegment < arcs.length - 1) {
          setCurrentSegment((prev) => prev + 1)
        } else {
          // Finale: pull out to a wide shot with every route visible and
          // hand the globe back to its idle auto-rotation.
          flyTo(20, 0, 2.5, 2000)
          const controls = globeRef.current?.controls()
          if (controls) controls.autoRotate = true
          hideTimer = setTimeout(() => setPlaneFrame(-1), 1500)
          onAnimationComplete?.()
        }
      }, 1000)
    }

    // Phase 2 — take off once the camera has settled.
    const takeoffTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, settleMs + 200)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(takeoffTimer)
      clearTimeout(advanceTimer)
      clearTimeout(hideTimer)
    }
  }, [currentSegment, arcs, flyTo, onAnimationComplete, onProgress])

  /** Same object every frame, fresh array so three-globe picks up the move. */
  const planeData = useMemo(
    () => (planeFrame >= 0 ? [planeRef.current] : []),
    [planeFrame]
  )

  /* ── Stable accessors ──────────────────────────────────────────────────
   * The rAF loop re-renders this component every frame. Inline lambdas
   * would change identity each render and make react-globe.gl re-style
   * every arc/point/element 60 times a second — memoize them all. */

  const pointLabel = useCallback((d: object) => {
    const p = d as { name: string }
    return `<div style="background:rgba(0,0,0,0.85);color:white;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:500">📍 ${p.name}<div style="font-size:10px;opacity:0.8;margin-top:2px">Click to explore</div></div>`
  }, [])

  const arcColor = useCallback(
    (d: object) => {
      const arc = d as FlightArc
      const isLatest = arc.index === revealedArcs - 1
      if (isLatest) return ['#ff6b35', '#ffb088'] // Bright for newest arc
      return ['rgba(255,107,53,0.4)', 'rgba(255,159,107,0.2)'] // Dimmed for older
    },
    [revealedArcs]
  )

  const arcStroke = useCallback(
    (d: object) => {
      const arc = d as FlightArc
      return arc.index === revealedArcs - 1 ? 3 : 1.5
    },
    [revealedArcs]
  )

  const arcAltitudeAccessor = useCallback((d: object) => {
    const arc = d as FlightArc
    return 0.12 + Math.min(arc.distance / 120, 1) * 0.3
  }, [])

  // Created ONCE per mount (three-globe rebuilds all elements whenever this
  // prop changes identity). Caches the node on the datum so the rAF loop can
  // rotate it without a DOM rebuild.
  const planeHtmlElement = useCallback((d: object) => {
    const p = d as PlaneDatum
    const wrap = document.createElement('div')
    // Inline style only — this element is created outside React,
    // and Tailwind classes here would not get processed.
    wrap.style.cssText = `
      pointer-events: none;
      transform: translate(-50%, -50%) rotate(${p.bearing}deg);
      transform-origin: center;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.55));
      will-change: transform;
    `
    // Lucide-style "Plane" SVG, oriented north (so rotate by bearing
    // points it where it's going).
    wrap.innerHTML = `
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="#ff6b35"
        stroke="#ffffff"
        stroke-width="0.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        style="display:block"
      >
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg>
    `
    p.el = wrap
    return wrap
  }, [])

  const showGlobe = mounted && dimensions.width > 0 && dimensions.height > 0

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '100%' }}
    >
      {showGlobe && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="/earth-dark.jpg"
          bumpImageUrl="/earth-topology.png"
          backgroundImageUrl="/night-sky.png"
          backgroundColor="rgba(0,0,0,0)"
          onGlobeReady={() => setGlobeReady(true)}
          // Points
          pointsData={pointsData}
          pointAltitude={0.02}
          pointRadius="size"
          pointColor="color"
          pointResolution={12}
          pointLabel={pointLabel}
          onPointClick={handlePointClick}
          // Arcs — solid lines; the airplane marker is the only "traveler",
          // so the old animated dash (a second moving dot racing the plane)
          // is gone. Newest route is bright/thick, older ones recede.
          arcsData={visibleArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={arcColor}
          arcAltitude={arcAltitudeAccessor}
          arcStroke={arcStroke}
          arcDashLength={1}
          arcDashGap={0}
          arcDashAnimateTime={0}
          arcCurveResolution={64}
          arcCircularResolution={32}
          // Rings
          ringsData={ringsData}
          ringColor={() => '#ff6b35'}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          // Airplane HTML marker — flies along the great-circle arc of the
          // current segment with bearing-correct rotation, chased by the
          // camera. htmlTransitionDuration MUST be 0: the default (1000ms)
          // tweens every position update, which made the plane permanently
          // lag a full second behind where the animation put it.
          htmlElementsData={planeData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude="altitude"
          htmlTransitionDuration={0}
          htmlElement={planeHtmlElement}
          // Atmosphere
          atmosphereColor="#ff6b35"
          atmosphereAltitude={0.12}
          showAtmosphere={true}
          // Settings
          enablePointerInteraction={true}
          animateIn={true}
          rendererConfig={{ antialias: true, alpha: true }}
        />
      )}

      {/* Loading state while dimensions are being measured */}
      {!showGlobe && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400" />
        </div>
      )}

    </div>
  )
}
