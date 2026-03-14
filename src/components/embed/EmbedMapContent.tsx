'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Globe, MapPin, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-stone-900">
      <Loader2 className="h-6 w-6 animate-spin text-olive-500" />
    </div>
  ),
})

interface Location {
  id: string
  title: string
  location: string
  country_code: string
  lat: number
  lng: number
}

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

interface EmbedMapContentProps {
  username: string
  displayName: string
  locations: Location[]
  countryCodes: string[]
}

export function EmbedMapContent({
  username,
  displayName,
  locations,
  countryCodes,
}: EmbedMapContentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !globeRef.current || locations.length === 0) return

    const timer = setTimeout(() => {
      if (!globeRef.current) return
      // Center on the average of all locations
      const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length
      const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length
      globeRef.current.pointOfView({ lat: avgLat, lng: avgLng, altitude: 2.2 }, 1000)

      const controls = globeRef.current.controls()
      if (controls) {
        controls.enableZoom = false
        controls.enablePan = false
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.3
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [mounted, locations])

  const pinData = locations.map(loc => ({
    lat: loc.lat,
    lng: loc.lng,
    size: 0.6,
    color: '#99B169',
    label: loc.title,
    id: loc.id,
  }))

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-stone-900 via-slate-800 to-stone-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0 bg-black/40 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-olive-500/20 flex items-center justify-center">
            <Globe className="h-3.5 w-3.5 text-olive-400" />
          </div>
          <span className="text-sm font-semibold">{displayName}&apos;s Globe</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {locations.length}
          </span>
          <span>{countryCodes.length} countries</span>
        </div>
      </div>

      {/* Interactive 3D Globe */}
      <div className="flex-1 relative min-h-0">
        {mounted && locations.length > 0 ? (
          <GlobeGL
            ref={globeRef}
            globeImageUrl="/earth-dark.jpg"
            bumpImageUrl="/earth-topology.png"
            backgroundImageUrl={undefined}
            backgroundColor="rgba(15, 23, 42, 1)"
            showAtmosphere={true}
            atmosphereColor="#4A5D23"
            atmosphereAltitude={0.15}
            pointsData={pinData}
            pointAltitude={0.02}
            pointRadius={0.4}
            pointColor={() => '#99B169'}
            pointLabel={(d: object) => {
              const point = d as { label: string }
              return `<div style="background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: white; border: 1px solid rgba(153,177,105,0.4);">${point.label}</div>`
            }}
            onPointHover={(point: object | null) => {
              if (point) {
                const p = point as { id: string }
                setHoveredLocation(locations.find(l => l.id === p.id) || null)
              } else {
                setHoveredLocation(null)
              }
            }}
            enablePointerInteraction={true}
            animateIn={true}
            width={undefined}
            height={undefined}
          />
        ) : locations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm">
            No public locations yet
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-olive-500" />
          </div>
        )}

        {/* Hovered location tooltip */}
        {hoveredLocation && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-olive-500/30 z-10">
            <p className="text-xs font-medium text-white">{hoveredLocation.title}</p>
            <p className="text-[10px] text-stone-400">{hoveredLocation.location}</p>
          </div>
        )}

        {/* Country flags floating strip */}
        {countryCodes.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
              {countryCodes.map(code => (
                <span key={code} className="text-lg shrink-0" title={code}>
                  {countryCodeToFlag(code)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer branding */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between flex-shrink-0 bg-black/40 backdrop-blur-sm">
        <Link
          href={`/u/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-olive-400 hover:text-olive-300 transition-colors flex items-center gap-1"
        >
          View full globe <ExternalLink className="h-3 w-3" />
        </Link>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-stone-500 hover:text-stone-400 transition-colors"
        >
          Adventure Log
        </Link>
      </div>
    </div>
  )
}
