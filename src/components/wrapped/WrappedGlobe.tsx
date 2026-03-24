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
  animate?: boolean
  onAnimationComplete?: () => void
  onProgress?: (progress: number, segmentIndex: number) => void
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

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

  // Start animation sequence
  useEffect(() => {
    if (!animate || !globeReady || arcs.length === 0) return

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
    const alt = Math.max(0.8, Math.min(2.2, arc.distance / 40))
    flyTo(midLat, midLng, alt, 1500)

    // Scale timing based on number of arcs — shorter per-segment for many locations
    const segmentDuration = arcs.length > 10 ? 2000 : arcs.length > 5 ? 2800 : 3500
    const revealDelay = Math.min(segmentDuration * 0.3, 1000)

    const revealTimer = setTimeout(() => {
      setRevealedArcs(currentSegment + 1)
      onProgress?.((currentSegment + 1) / arcs.length, currentSegment)
    }, revealDelay)

    const nextTimer = setTimeout(() => {
      if (currentSegment < arcs.length - 1) {
        setCurrentSegment((prev) => prev + 1)
      } else {
        flyTo(20, 0, 2.5, 2000)
        onAnimationComplete?.()
      }
    }, segmentDuration)

    return () => {
      clearTimeout(revealTimer)
      clearTimeout(nextTimer)
    }
  }, [currentSegment, arcs, flyTo, onAnimationComplete, onProgress])

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
            return `<div style="background:rgba(0,0,0,0.8);color:white;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:500">${p.name}</div>`
          }}
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
