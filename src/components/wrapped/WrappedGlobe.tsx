'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface WrappedLocation {
  lat: number
  lng: number
  name: string
  date: string
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

interface WrappedGlobeProps {
  locations: WrappedLocation[]
  /** When true, auto-animate through locations */
  animate?: boolean
  /** Called when the animation finishes all segments */
  onAnimationComplete?: () => void
  /** Called with progress 0-1 during flight animation */
  onProgress?: (progress: number, segmentIndex: number) => void
  /** Globe size class */
  className?: string
}

export function WrappedGlobe({
  locations,
  animate = true,
  onAnimationComplete,
  onProgress,
  className = '',
}: WrappedGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [revealedArcs, setRevealedArcs] = useState<number>(animate ? 0 : 999)
  const [currentSegment, setCurrentSegment] = useState(-1)
  const animationRef = useRef<number | null>(null)
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

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

  // Pin data: only show locations for revealed arcs
  const pointsData = useMemo(() => {
    if (locations.length === 0) return []
    const sorted = [...locations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const count = Math.min(revealedArcs + 1, sorted.length)
    return sorted.slice(0, count).map((loc) => ({
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      size: 1.2,
      color: '#ff6b35',
    }))
  }, [locations, revealedArcs])

  // Rings around current destination
  const ringsData = useMemo(() => {
    if (pointsData.length === 0) return []
    const latest = pointsData[pointsData.length - 1]
    return [
      {
        lat: latest.lat,
        lng: latest.lng,
        maxR: 4,
        propagationSpeed: 2,
        repeatPeriod: 1000,
      },
    ]
  }, [pointsData])

  // Visible arcs (progressively revealed)
  const visibleArcs = useMemo(() => {
    return arcs.slice(0, revealedArcs)
  }, [arcs, revealedArcs])

  // Init globe camera
  useEffect(() => {
    if (!globeRef.current || !globeReady) return
    const globe = globeRef.current

    // Start with a wide view
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0)

    const controls = globe.controls()
    if (controls) {
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.5
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.3
    }
  }, [globeReady])

  // Fly to a location
  const flyTo = useCallback(
    (lat: number, lng: number, altitude: number, duration: number) => {
      if (!globeRef.current) return
      globeRef.current.pointOfView({ lat, lng, altitude }, duration)
    },
    []
  )

  // Animation: reveal arcs one by one with camera fly-to
  useEffect(() => {
    if (!animate || !globeReady || arcs.length === 0) return

    // Start animation after a short delay
    const startTimer = setTimeout(() => {
      setCurrentSegment(0)
    }, 1500)

    return () => clearTimeout(startTimer)
  }, [animate, globeReady, arcs.length])

  // Handle segment progression
  useEffect(() => {
    if (currentSegment < 0 || currentSegment >= arcs.length) return

    const arc = arcs[currentSegment]

    // Fly to the midpoint of this arc
    const midLat = (arc.startLat + arc.endLat) / 2
    const midLng = (arc.startLng + arc.endLng) / 2
    // Altitude based on distance — closer for short hops
    const alt = Math.max(0.8, Math.min(2.2, arc.distance / 40))
    flyTo(midLat, midLng, alt, 1500)

    // Reveal arc after camera starts moving
    const revealTimer = setTimeout(() => {
      setRevealedArcs(currentSegment + 1)
      onProgress?.(
        (currentSegment + 1) / arcs.length,
        currentSegment
      )
    }, 800)

    // Move to next segment
    const nextTimer = setTimeout(() => {
      if (currentSegment < arcs.length - 1) {
        setCurrentSegment((prev) => prev + 1)
      } else {
        // Animation complete — zoom out to show all
        flyTo(20, 0, 2.5, 2000)
        onAnimationComplete?.()
      }
    }, 2800)

    return () => {
      clearTimeout(revealTimer)
      clearTimeout(nextTimer)
    }
  }, [currentSegment, arcs, flyTo, onAnimationComplete, onProgress])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <Globe
        ref={globeRef}
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
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
          return `<div style="background:rgba(0,0,0,0.8);color:white;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:500">${p.name}</div>`
        }}
        // Arcs
        arcsData={visibleArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ['#ff6b35', '#ff9f6b']}
        arcAltitude={(d: object) => {
          const arc = d as FlightArc
          return 0.12 + Math.min(arc.distance / 120, 1) * 0.3
        }}
        arcStroke={(d: object) => {
          const arc = d as FlightArc
          const recency =
            arc.total > 1 ? arc.index / (arc.total - 1) : 1
          return 2.5 * (0.6 + recency * 0.4)
        }}
        arcDashLength={0.6}
        arcDashGap={0.08}
        arcDashAnimateTime={3000}
        arcCurveResolution={64}
        arcCircularResolution={32}
        // Rings
        ringsData={ringsData}
        ringColor={() => '#ff6b35'}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        // Atmosphere
        atmosphereColor="#ff6b35"
        atmosphereAltitude={0.12}
        showAtmosphere={true}
        // Settings
        enablePointerInteraction={true}
        animateIn={true}
        rendererConfig={{ antialias: true, alpha: true }}
      />

      {/* Plane emoji following current arc */}
      {currentSegment >= 0 && currentSegment < arcs.length && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="text-3xl animate-pulse">✈️</div>
        </div>
      )}
    </div>
  )
}
