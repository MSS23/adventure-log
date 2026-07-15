'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { gcInterpolate, gcBearing, easeInOutCubic } from '@/lib/utils/geoCalculations'
import { createAirplaneModel } from '@/components/globe/createAirplaneModel'

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
 * The airplane + live trail are real THREE objects inside the globe's WebGL
 * scene, NOT DOM overlays. This matters twice over: the video export records
 * the canvas (a DOM plane simply never appeared in exported videos), and an
 * in-scene mesh tracks the camera perfectly with no HTML reprojection lag.
 * Both are managed imperatively from the flight rAF loop — zero React
 * re-renders per frame.
 */
interface FlightSceneObjects {
  plane: THREE.Group
  trail: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
}

/** The shared aircraft model points along +Z, so up.copy(normal) plus
 *  lookAt(ahead) keeps it tangent to the globe while rotateZ supplies bank. */
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
  })
}

/** Camera framing that covers every visited location: unit-vector centroid
 *  + max angular spread → lat/lng/altitude for the finale wide shot. */
function frameAllLocations(locations: WrappedLocation[]): { lat: number; lng: number; altitude: number } {
  if (locations.length === 0) return { lat: 20, lng: 0, altitude: 2.5 }
  const rad = Math.PI / 180
  const sum = new THREE.Vector3()
  const vecs = locations.map((l) => {
    const v = new THREE.Vector3(
      Math.cos(l.lat * rad) * Math.cos(l.lng * rad),
      Math.sin(l.lat * rad),
      Math.cos(l.lat * rad) * Math.sin(l.lng * rad)
    )
    sum.add(v)
    return v
  })
  if (sum.lengthSq() < 1e-6) return { lat: 20, lng: 0, altitude: 2.8 } // antipodal degenerate
  const centroid = sum.normalize()
  let maxAngle = 0
  for (const v of vecs) maxAngle = Math.max(maxAngle, centroid.angleTo(v))
  return {
    lat: Math.asin(centroid.y) / rad,
    lng: Math.atan2(centroid.z, centroid.x) / rad,
    altitude: Math.min(3.4, Math.max(1.7, 1.15 + maxAngle * 1.9)),
  }
}

/** Sampling density of the live trail tube (and its drawRange step). */
const TRAIL_SEGMENTS = 128
const TRAIL_RADIAL = 8
/** Tube radius in globe units: visible in exports without overpowering the
 *  smaller aircraft or the destination pins. */
const TRAIL_RADIUS = 0.55
/** Base plane size in globe units (globe radius = 100). */
const PLANE_SCALE = 0.78

interface WrappedGlobeProps {
  locations: WrappedLocation[]
  animate?: boolean
  onAnimationComplete?: () => void
  onProgress?: (progress: number, segmentIndex: number) => void
  onPinClick?: (location: WrappedLocation) => void
  className?: string
  /**
   * Called with the WebGL canvas once the globe is ready — used by the video
   * export to feed the canvas into a captureStream compositor.
   */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  /**
   * Keep the WebGL drawing buffer readable after compositing. Required while
   * the video export drawImage()s this canvas from its own rAF loop; left off
   * otherwise (it costs memory/perf). Construction-time only — remount the
   * globe (new key) to change it.
   */
  preserveDrawingBuffer?: boolean
  /** Disable pointer input (a drag mid-export would ruin the chase cam). */
  interactive?: boolean
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
  onCanvasReady,
  preserveDrawingBuffer = false,
  interactive = true,
}: WrappedGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [revealedArcs, setRevealedArcs] = useState<number>(animate ? 0 : 999)
  const [currentSegment, setCurrentSegment] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Matte near-black sphere in place of the earth texture (which rendered
  // poorly, especially in exports). The faint blue-black tint + whisper of
  // specular keeps the sphere reading as a curved solid rather than a hole
  // in the star field; the atmosphere rim draws its edge.
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x0b0b10,
        specular: new THREE.Color(0x1a1a22),
        shininess: 8,
      }),
    []
  )

  // Landmasses as vector outlines on the black sphere — crisp at any zoom
  // (unlike the old raster texture) and they keep the flyover geographically
  // readable: coastlines still slide under the plane. Geometry-only Natural
  // Earth 110m from our own public/ dir, so it ships in the mobile bundle.
  const [countries, setCountries] = useState<object[]>([])
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    fetch('/countries-110m.geojson')
      .then((r) => r.json())
      .then((geo: { features: object[] }) => {
        if (!cancelled && Array.isArray(geo?.features)) setCountries(geo.features)
      })
      .catch(() => {
        /* outlines are decorative — the flyover works without them */
      })
    return () => {
      cancelled = true
    }
  }, [mounted])

  // In-scene flight objects (plane mesh + trail tube), owned by the setup
  // effect below and driven imperatively from the flight rAF loop.
  const flightSceneRef = useRef<FlightSceneObjects | null>(null)
  // Banking state persists across frames within a segment.
  const rollRef = useRef(0)
  const lastBearingRef = useRef<number | null>(null)

  // In-canvas city labels (three-globe renders these as sprites, so they are
  // part of the recorded video — unlike the page's DOM overlays).
  const [flightLabels, setFlightLabels] = useState<Array<{ lat: number; lng: number; text: string }>>([])
  const destLabelShownRef = useRef(false)

  // One-shot expanding ring fired at each landing.
  const [burstRing, setBurstRing] = useState<{ lat: number; lng: number; maxR: number; propagationSpeed: number; repeatPeriod: number } | null>(null)

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

  // Rings: steady pulse on the latest destination + a one-shot wide burst
  // right at each landing (arrival emphasis).
  const ringsData = useMemo(() => {
    const rings: Array<{ lat: number; lng: number; maxR: number; propagationSpeed: number; repeatPeriod: number }> = []
    if (pointsData.length > 0) {
      const latest = pointsData[pointsData.length - 1]
      rings.push({
        lat: latest.lat,
        lng: latest.lng,
        maxR: 4,
        propagationSpeed: 2,
        repeatPeriod: 1000,
      })
    }
    if (burstRing) rings.push(burstRing)
    return rings
  }, [pointsData, burstRing])

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

  // Surface the WebGL canvas to the parent once the globe is live (the ref
  // itself is internal; the canvas is the only thing the export needs).
  useEffect(() => {
    if (!globeReady || !onCanvasReady) return
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) onCanvasReady(canvas)
  }, [globeReady, onCanvasReady])

  // Mount the in-scene flight objects (animated globes only). The plane and
  // trail live directly in the globe's THREE scene so they render into the
  // canvas — and therefore into exported videos.
  useEffect(() => {
    if (!globeReady || !animate) return
    const globe = globeRef.current
    if (!globe) return
    const scene = globe.scene()

    const plane = createAirplaneModel()
    plane.visible = false
    scene.add(plane)

    const trail = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xffb27a, transparent: true, opacity: 0.95 })
    )
    trail.visible = false
    scene.add(trail)

    flightSceneRef.current = { plane, trail }

    return () => {
      flightSceneRef.current = null
      scene.remove(plane)
      scene.remove(trail)
      disposeObject(plane)
      disposeObject(trail)
    }
  }, [globeReady, animate])

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

  // Single-location cinematic: a one-trip year has no flight to fly, but it
  // shouldn't cut straight to stats either. Instead we "spotlight" the one
  // pin — the globe turns to bring it into frame, the camera swoops in and
  // slowly orbits it, a ring bursts on arrival — then hand off to the finale.
  // Gives a one-pin Wrapped a real moment (and real footage to export).
  useEffect(() => {
    if (!animate || !globeReady) return
    if (arcs.length !== 0 || sortedLocations.length !== 1) return

    const only = sortedLocations[0]
    const globe = globeRef.current
    if (!globe) return

    // Reveal the pin + its label up front.
    setRevealedArcs(1)
    setFlightLabels([{ lat: only.lat, lng: only.lng, text: only.name.split(',')[0] }])
    if (flightSceneRef.current) flightSceneRef.current.plane.visible = false

    // Open on a wide shot, offset in longitude so the approach reads as the
    // planet rotating to reveal the destination.
    const START_LNG_OFFSET = -58
    const START_ALT = 2.9
    const APPROACH_ALT = 1.35
    const FINAL_ALT = 0.95
    const ORBIT_SWEEP = 26 // degrees of gentle longitude drift while framed
    globe.pointOfView({ lat: only.lat * 0.6, lng: only.lng + START_LNG_OFFSET, altitude: START_ALT }, 0)

    const controls = globe.controls()
    if (controls) controls.autoRotate = false

    const DURATION = 6200
    let raf = 0
    let startTime = 0
    let burstFired = false
    let burstTimer: ReturnType<typeof setTimeout> | undefined
    let doneTimer: ReturnType<typeof setTimeout> | undefined

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const t = Math.min(1, (now - startTime) / DURATION)

      let lat: number, lng: number, alt: number
      if (t < 0.5) {
        // Approach: swoop from the wide offset shot down onto the pin.
        const k = easeInOutCubic(t / 0.5)
        lat = only.lat * 0.6 + (only.lat - only.lat * 0.6) * k
        lng = only.lng + START_LNG_OFFSET * (1 - k)
        alt = START_ALT + (APPROACH_ALT - START_ALT) * k
      } else {
        // Framed: slow orbit + push-in on the destination.
        const k = (t - 0.5) / 0.5
        const ke = easeInOutCubic(k)
        lat = only.lat
        lng = only.lng + ORBIT_SWEEP * ke
        alt = APPROACH_ALT + (FINAL_ALT - APPROACH_ALT) * ke
      }
      globe.pointOfView({ lat, lng, altitude: alt }, 0)

      onProgress?.(t, 0)

      if (!burstFired && t >= 0.52) {
        burstFired = true
        setBurstRing({ lat: only.lat, lng: only.lng, maxR: 9, propagationSpeed: 7, repeatPeriod: 3000 })
        burstTimer = setTimeout(() => setBurstRing(null), 1200)
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick)
        return
      }

      // Finale: hand the globe back to idle rotation and complete.
      if (controls) controls.autoRotate = true
      onProgress?.(1, 0)
      doneTimer = setTimeout(() => onAnimationComplete?.(), 400)
    }

    // Brief beat before the swoop so the wide shot registers.
    const startTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, 900)

    return () => {
      clearTimeout(startTimer)
      cancelAnimationFrame(raf)
      clearTimeout(burstTimer)
      clearTimeout(doneTimer)
    }
  }, [animate, globeReady, arcs.length, sortedLocations, onProgress, onAnimationComplete])

  // Handle one flight segment: settle the camera on the departure point with
  // the plane parked, take off, chase the plane along the great circle while
  // the trail paints itself underneath, land (ring burst + camera push-in +
  // destination label), pause, then advance — or pull out to a finale wide
  // shot framed around everywhere the user actually went.
  useEffect(() => {
    if (currentSegment < 0 || currentSegment >= arcs.length) return

    const arc = arcs[currentSegment]
    const start = { lat: arc.startLat, lng: arc.startLng }
    const end = { lat: arc.endLat, lng: arc.endLng }
    const peak = peakAltitudeFor(arc.distance)
    // Camera rides above the arc's cruising altitude — close for short
    // hops, pulled out for long hauls so there's geographic context.
    const camAlt = Math.max(peak + 0.6, Math.min(2.2, arc.distance / 40))

    const globe = globeRef.current
    const scene3 = flightSceneRef.current

    // Phase 1 — fly the camera to the departure point.
    const settleMs = currentSegment === 0 ? 1400 : 600
    flyTo(start.lat, start.lng, camAlt, settleMs)

    // Origin label; the destination's appears on final approach.
    const originName = sortedLocations[currentSegment]?.name?.split(',')[0]
    const destName = sortedLocations[currentSegment + 1]?.name?.split(',')[0]
    destLabelShownRef.current = false
    if (originName) setFlightLabels([{ lat: start.lat, lng: start.lng, text: originName }])

    // Pre-sample the whole flight path once: the SAME points drive the trail
    // tube (revealed via drawRange, no per-frame geometry work) and the
    // plane's position/orientation lookups.
    const pathPoints: THREE.Vector3[] = []
    if (globe && scene3) {
      for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
        const t = i / TRAIL_SEGMENTS
        const p = gcInterpolate(start, end, t)
        const c = globe.getCoords(p.lat, p.lng, arcAltitude(t, peak))
        pathPoints.push(new THREE.Vector3(c.x, c.y, c.z))
      }
      const tube = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pathPoints),
        TRAIL_SEGMENTS,
        TRAIL_RADIUS,
        TRAIL_RADIAL,
        false
      )
      tube.setDrawRange(0, 0)
      scene3.trail.geometry.dispose()
      scene3.trail.geometry = tube
      scene3.trail.visible = true

      // Park the plane on the tarmac, nose pointed down the route.
      scene3.plane.position.copy(pathPoints[0])
      scene3.plane.up.copy(pathPoints[0].clone().normalize())
      scene3.plane.lookAt(pathPoints[1])
      scene3.plane.scale.setScalar(PLANE_SCALE)
      scene3.plane.visible = true
      rollRef.current = 0
      lastBearingRef.current = null
    }

    // Pace by hop length (a Paris→Rome puddle-jump shouldn't take as long as
    // Tokyo→LA), compressed when the year has many stops.
    const paceScale = arcs.length > 10 ? 0.6 : arcs.length > 6 ? 0.8 : 1
    const segmentDuration = Math.min(4200, Math.max(1500, 1300 + arc.distance * 24)) * paceScale

    let raf = 0
    let startTime = 0
    let advanceTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let burstTimer: ReturnType<typeof setTimeout> | undefined

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const linearT = Math.min(1, (now - startTime) / segmentDuration)
      const easedT = easeInOutCubic(linearT)
      const pos = gcInterpolate(start, end, easedT)
      // Cinematic breathing: peaks at cruise (t=0.5), zero at the endpoints —
      // the camera pulls out for geographic context mid-flight and dives back
      // in for the landing, while the plane grows slightly at cruise so it
      // doesn't shrink into the zoomed-out frame. Reads as takeoff → cruise →
      // final approach instead of a flat point-to-point slide.
      const breathe = Math.sin(Math.PI * easedT)

      if (globe && scene3) {
        // Plane: position on the arc, oriented at a point just ahead of it,
        // banked into heading changes.
        const alt = arcAltitude(easedT, peak)
        const c = globe.getCoords(pos.lat, pos.lng, alt)
        scene3.plane.position.set(c.x, c.y, c.z)

        const aheadT = Math.min(1, easedT + 0.03)
        const aheadPos = gcInterpolate(start, end, aheadT)
        const ahead = globe.getCoords(aheadPos.lat, aheadPos.lng, arcAltitude(aheadT, peak))
        scene3.plane.up.copy(new THREE.Vector3(c.x, c.y, c.z).normalize())
        scene3.plane.lookAt(ahead.x, ahead.y, ahead.z)

        const bearingNow = gcBearing(pos, end)
        if (lastBearingRef.current !== null && easedT < 0.98) {
          let dB = bearingNow - lastBearingRef.current
          if (dB > 180) dB -= 360
          else if (dB < -180) dB += 360
          const targetRoll = Math.max(-0.55, Math.min(0.55, dB * 6))
          rollRef.current += (targetRoll - rollRef.current) * 0.12
        } else {
          rollRef.current *= 0.85
        }
        lastBearingRef.current = bearingNow
        scene3.plane.rotateZ(rollRef.current)

        scene3.plane.scale.setScalar(PLANE_SCALE * (1 + 0.12 * breathe))

        // Trail paints itself under the plane (drawRange over the tube's
        // index buffer: TRAIL_RADIAL * 6 indices per tubular segment).
        const revealed = Math.floor(easedT * TRAIL_SEGMENTS)
        scene3.trail.geometry.setDrawRange(0, revealed * TRAIL_RADIAL * 6)
      }

      // Destination label fades in on final approach — in-canvas, so it's in
      // the exported video too.
      if (!destLabelShownRef.current && easedT >= 0.55 && destName) {
        destLabelShownRef.current = true
        setFlightLabels(
          originName
            ? [
                { lat: start.lat, lng: start.lng, text: originName },
                { lat: end.lat, lng: end.lng, text: destName },
              ]
            : [{ lat: end.lat, lng: end.lng, text: destName }]
        )
      }

      // Chase cam with a slight lead toward the destination, so the frame
      // reads "going somewhere" instead of a dot pinned to the center.
      const camPos = gcInterpolate(start, end, Math.min(1, easedT + 0.05))
      globe?.pointOfView(
        { lat: camPos.lat, lng: camPos.lng, altitude: camAlt * (1 + 0.3 * breathe) },
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

      // Landed — park the plane on the destination, retire the live trail
      // (the stamped arc takes over), pop the arrival ring, push the camera
      // in on the new pin.
      if (globe && scene3) {
        const endCoord = globe.getCoords(end.lat, end.lng, 0.015)
        scene3.plane.position.set(endCoord.x, endCoord.y, endCoord.z)
        scene3.plane.scale.setScalar(PLANE_SCALE)
        scene3.trail.visible = false
      }
      setRevealedArcs(currentSegment + 1)
      setBurstRing({ lat: end.lat, lng: end.lng, maxR: 9, propagationSpeed: 7, repeatPeriod: 3000 })
      burstTimer = setTimeout(() => setBurstRing(null), 1200)
      flyTo(end.lat, end.lng, Math.max(0.95, camAlt * 0.78), 650)
      onProgress?.((currentSegment + 1) / arcs.length, currentSegment)

      // Brief pause on the destination, then move on.
      advanceTimer = setTimeout(() => {
        if (currentSegment < arcs.length - 1) {
          setCurrentSegment((prev) => prev + 1)
        } else {
          // Finale: pull out to a wide shot framed around the year's actual
          // footprint and hand the globe back to its idle auto-rotation.
          const frame = frameAllLocations(sortedLocations)
          flyTo(frame.lat, frame.lng, frame.altitude, 2600)
          const controls = globeRef.current?.controls()
          if (controls) controls.autoRotate = true
          // Every stop labeled on the wide shot (skipped for busy years).
          setFlightLabels(
            sortedLocations.length <= 12
              ? sortedLocations.map((l) => ({ lat: l.lat, lng: l.lng, text: l.name.split(',')[0] }))
              : []
          )
          hideTimer = setTimeout(() => {
            const s3 = flightSceneRef.current
            if (s3) s3.plane.visible = false
          }, 1500)
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
      clearTimeout(burstTimer)
    }
  }, [currentSegment, arcs, sortedLocations, flyTo, onAnimationComplete, onProgress])

  /* ── Stable accessors ──────────────────────────────────────────────────
   * Inline lambdas would change identity on re-render and make
   * react-globe.gl re-style every arc/point/label — memoize them all. */

  const pointLabel = useCallback((d: object) => {
    const p = d as { name: string }
    return `<div style="background:rgba(0,0,0,0.85);color:white;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:500">${p.name}<div style="font-size:10px;opacity:0.8;margin-top:2px">Click to explore</div></div>`
  }, [])

  const arcColor = useCallback(
    (d: object) => {
      const arc = d as FlightArc
      const isLatest = arc.index === revealedArcs - 1
      if (isLatest) return ['#ff6b35', '#ffb088'] // Bright for newest arc
      return ['rgba(255,107,53,0.45)', 'rgba(255,159,107,0.3)'] // Receded — glows plenty against the black globe
    },
    [revealedArcs]
  )

  const arcStroke = useCallback(
    (d: object) => {
      const arc = d as FlightArc
      // Latest matches the live trail's width (see TRAIL_RADIUS) so the
      // landing handoff between the two is seamless.
      return arc.index === revealedArcs - 1 ? 1.0 : 0.65
    },
    [revealedArcs]
  )

  const arcAltitudeAccessor = useCallback((d: object) => {
    const arc = d as FlightArc
    return 0.12 + Math.min(arc.distance / 120, 1) * 0.3
  }, [])

  const labelLat = useCallback((d: object) => (d as { lat: number }).lat, [])
  const labelLng = useCallback((d: object) => (d as { lng: number }).lng, [])
  const labelText = useCallback((d: object) => (d as { text: string }).text, [])
  const labelColor = useCallback(() => 'rgba(255,233,223,0.95)', [])

  // Country outlines: a whisper of warm land fill so continents read as
  // shapes, plus a soft coastline stroke. Deliberately dim — the orange
  // story layer (arcs/trail/pins) must stay the brightest thing on the globe.
  const polygonCapColor = useCallback(() => 'rgba(255,183,140,0.06)', [])
  const polygonSideColor = useCallback(() => 'rgba(0,0,0,0)', [])
  const polygonStrokeColor = useCallback(() => 'rgba(255,209,180,0.32)', [])

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
          // Deliberately textureless: the low-res earth imagery read as poor
          // render quality, so the globe is a matte black sphere (see
          // globeMaterial above) with vector country outlines (polygons layer
          // below) keeping the geography readable. The warm atmosphere rim
          // keeps the Wrapped sunset branding and defines the planet's edge.
          globeImageUrl={null}
          globeMaterial={globeMaterial}
          backgroundImageUrl="/night-sky.png"
          backgroundColor="rgba(0,0,0,0)"
          onGlobeReady={() => setGlobeReady(true)}
          // Country outlines (see the countries fetch above)
          polygonsData={countries}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={0.005}
          polygonsTransitionDuration={0}
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
          // City labels — three-globe sprites, so they live INSIDE the WebGL
          // canvas and appear in exported videos (the airplane + live trail
          // are direct scene objects managed by the flight effect above).
          labelsData={flightLabels}
          labelLat={labelLat}
          labelLng={labelLng}
          labelText={labelText}
          labelColor={labelColor}
          labelSize={1.3}
          labelDotRadius={0.45}
          labelAltitude={0.015}
          labelResolution={2}
          // Atmosphere
          atmosphereColor="#ff6b35"
          atmosphereAltitude={0.16}
          showAtmosphere={true}
          // Settings
          enablePointerInteraction={interactive}
          animateIn={true}
          rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer }}
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
