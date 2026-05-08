'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'

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
 * Re-positioned every requestAnimationFrame while a segment is in flight.
 */
interface PlanePos {
  lat: number
  lng: number
  altitude: number
  /** Compass bearing in degrees (0 = north). Used to rotate the SVG. */
  bearing: number
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
 * Great-circle helpers
 * ─────────────────────────────────────────────────────────────────────── */

/** Spherical (great-circle) interpolation between two lat/lng points. */
function gcInterpolate(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const λ1 = (a.lng * Math.PI) / 180
  const λ2 = (b.lng * Math.PI) / 180

  const Δφ = φ2 - φ1
  const Δλ = λ2 - λ1
  const c =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const δ = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))

  // Same point — no need to interpolate.
  if (δ < 1e-9) return { lat: a.lat, lng: a.lng }

  const A = Math.sin((1 - t) * δ) / Math.sin(δ)
  const B = Math.sin(t * δ) / Math.sin(δ)

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)

  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI
  const lng = (Math.atan2(y, x) * 180) / Math.PI
  return { lat, lng }
}

/** Initial-bearing in degrees from a → b along the great circle. */
function gcBearing(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

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

/** Easing curve: ease-in-out for a graceful "ascent → cruise → descent"
 *  feeling instead of a constant-speed crawl. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
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

  // Plane state — `null` while idle (between segments / before start / after
  // last segment), populated with current lat/lng/altitude/bearing while a
  // segment is in flight. Re-rendering ONE htmlElement at 60fps is cheap.
  const [planePos, setPlanePos] = useState<PlanePos | null>(null)

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

  // Build arcs from sorted locations
  const arcs: FlightArc[] = useMemo(() => {
    if (locations.length < 2) return []
    const sorted = [...locations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const paths: FlightArc[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i]
      const to = sorted[i + 1]
      const dLat = to.lat - from.lat
      const dLng = to.lng - from.lng
      const distance = Math.sqrt(dLat * dLat + dLng * dLng)
      paths.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        name: `${from.name} → ${to.name}`,
        distance,
        index: i,
        total: sorted.length - 1,
      })
    }
    return paths
  }, [locations])

  // Pin data: show all locations when not animating, progressive when animating
  const pointsData = useMemo(() => {
    if (locations.length === 0) return []
    const sorted = [...locations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const count = animate ? Math.min(revealedArcs + 1, sorted.length) : sorted.length
    return sorted.slice(0, count).map((loc) => ({
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      size: 1.2,
      color: '#ff6b35',
    }))
  }, [locations, revealedArcs, animate])

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

    // Center on first location if available, otherwise default view
    if (locations.length > 0) {
      const first = locations[0]
      globe.pointOfView({ lat: first.lat, lng: first.lng, altitude: 2.5 }, 0)
    } else {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0)
    }

    const controls = globe.controls()
    if (controls) {
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.5
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.3
    }
  }, [globeReady, locations])

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

  // Handle segment progression — fly camera, animate the airplane along
  // the great-circle arc, reveal the arc line behind it, advance to next.
  useEffect(() => {
    if (currentSegment < 0 || currentSegment >= arcs.length) return

    const arc = arcs[currentSegment]
    const start = { lat: arc.startLat, lng: arc.startLng }
    const end = { lat: arc.endLat, lng: arc.endLng }
    const peak = peakAltitudeFor(arc.distance)

    // Fly camera to the midpoint of this arc
    const midLat = (arc.startLat + arc.endLat) / 2
    const midLng = (arc.startLng + arc.endLng) / 2
    const camAlt = Math.max(0.8, Math.min(2.2, arc.distance / 40))
    flyTo(midLat, midLng, camAlt, 1500)

    // Scale timing based on number of arcs — shorter per-segment for many locations
    const segmentDuration = arcs.length > 10 ? 2000 : arcs.length > 5 ? 2800 : 3500
    const revealDelay = Math.min(segmentDuration * 0.3, 1000)

    // Spawn the plane at the segment start position, oriented at the
    // initial bearing — this is the "boarding" frame before takeoff.
    setPlanePos({
      lat: start.lat,
      lng: start.lng,
      altitude: 0,
      bearing: gcBearing(start, end),
    })

    // rAF loop interpolates the plane along the great-circle arc with an
    // ease-in-out for ascent/cruise/descent feeling, recomputing bearing
    // continuously so it points where it's actually going (great-circle
    // bearing rotates as you cross meridians).
    const startTime = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - startTime
      const linearT = Math.min(1, elapsed / segmentDuration)
      const easedT = easeInOutCubic(linearT)
      const pos = gcInterpolate(start, end, easedT)
      // Bearing toward end from current pos — slightly nicer than the
      // constant initial bearing for long arcs.
      const bearing = gcBearing(pos, end)
      setPlanePos({
        lat: pos.lat,
        lng: pos.lng,
        altitude: arcAltitude(easedT, peak),
        bearing,
      })
      if (linearT < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    const revealTimer = setTimeout(() => {
      setRevealedArcs(currentSegment + 1)
      onProgress?.((currentSegment + 1) / arcs.length, currentSegment)
    }, revealDelay)

    const nextTimer = setTimeout(() => {
      // Park the plane at the destination so it visually "lands" before
      // we either advance to the next segment or finish the reel.
      setPlanePos({
        lat: end.lat,
        lng: end.lng,
        altitude: 0,
        bearing: gcBearing(start, end),
      })
      if (currentSegment < arcs.length - 1) {
        setCurrentSegment((prev) => prev + 1)
      } else {
        flyTo(20, 0, 2.5, 2000)
        // Hide plane on the wide-shot finale — it's no longer flying.
        setTimeout(() => setPlanePos(null), 1500)
        onAnimationComplete?.()
      }
    }, segmentDuration)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(revealTimer)
      clearTimeout(nextTimer)
    }
  }, [currentSegment, arcs, flyTo, onAnimationComplete, onProgress])

  /** htmlElementsData accepts a stable array; one entry while flying. */
  const planeData = useMemo(() => (planePos ? [planePos] : []), [planePos])

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
          pointLabel={(d: object) => {
            const p = d as { name: string }
            return `<div style="background:rgba(0,0,0,0.85);color:white;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:500">📍 ${p.name}<div style="font-size:10px;opacity:0.8;margin-top:2px">Click to explore</div></div>`
          }}
          onPointClick={handlePointClick}
          // Arcs
          arcsData={visibleArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={(d: object) => {
            const arc = d as FlightArc
            const isLatest = arc.index === revealedArcs - 1
            if (isLatest) return ['#ff6b35', '#ffb088'] // Bright for newest arc
            return ['rgba(255,107,53,0.4)', 'rgba(255,159,107,0.2)'] // Dimmed for older
          }}
          arcAltitude={(d: object) => {
            const arc = d as FlightArc
            return 0.12 + Math.min(arc.distance / 120, 1) * 0.3
          }}
          arcStroke={(d: object) => {
            const arc = d as FlightArc
            const isLatest = arc.index === revealedArcs - 1
            return isLatest ? 3 : 1.5
          }}
          arcDashLength={(d: object) => {
            const arc = d as FlightArc
            const isLatest = arc.index === revealedArcs - 1
            return isLatest ? 0.04 : 1.0 // Latest: traveling dot, older: solid line
          }}
          arcDashGap={(d: object) => {
            const arc = d as FlightArc
            const isLatest = arc.index === revealedArcs - 1
            return isLatest ? 0.96 : 0
          }}
          arcDashAnimateTime={(d: object) => {
            const arc = d as FlightArc
            const isLatest = arc.index === revealedArcs - 1
            return isLatest ? 2000 : 0
          }}
          arcCurveResolution={64}
          arcCircularResolution={32}
          // Rings
          ringsData={ringsData}
          ringColor={() => '#ff6b35'}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          // Airplane HTML marker — flies along the great-circle arc of the
          // current segment with bearing-correct rotation. Replaces the
          // "blob traveling along a dashed line" feeling with an actual
          // plane that takes off, cruises, and lands.
          htmlElementsData={planeData}
          htmlLat={(d: object) => (d as PlanePos).lat}
          htmlLng={(d: object) => (d as PlanePos).lng}
          htmlAltitude={(d: object) => (d as PlanePos).altitude}
          htmlElement={(d: object) => {
            const p = d as PlanePos
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
            return wrap
          }}
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
