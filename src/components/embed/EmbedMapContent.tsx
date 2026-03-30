'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Globe, ExternalLink, MapPin, Plane } from 'lucide-react'
import Link from 'next/link'

const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => null,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }
  }, [])

  useEffect(() => {
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [updateDimensions])

  useEffect(() => {
    if (!mounted || !globeRef.current || locations.length === 0) return

    const timer = setTimeout(() => {
      if (!globeRef.current) return
      const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length
      const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length
      globeRef.current.pointOfView({ lat: avgLat, lng: avgLng, altitude: 1.8 }, 1500)

      const controls = globeRef.current.controls()
      if (controls) {
        controls.enableZoom = false
        controls.enablePan = false
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.4
      }
      setGlobeReady(true)
    }, 600)

    return () => clearTimeout(timer)
  }, [mounted, locations])

  const pinData = locations.map(loc => ({
    lat: loc.lat,
    lng: loc.lng,
    size: 0.5,
    color: '#99B169',
    label: loc.title,
    location: loc.location,
    id: loc.id,
  }))

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="h-full w-full relative bg-[#0a0a0a] overflow-hidden">
      {/* Globe container — fills everything */}
      <div ref={containerRef} className="absolute inset-0">
        {mounted && locations.length > 0 && dimensions.width > 0 ? (
          <GlobeGL
            ref={globeRef}
            globeImageUrl="/earth-dark.jpg"
            bumpImageUrl="/earth-topology.png"
            backgroundImageUrl={undefined}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#4A5D23"
            atmosphereAltitude={0.15}
            pointsData={pinData}
            pointAltitude={0.02}
            pointRadius={0.4}
            pointColor={() => '#99B169'}
            pointLabel={(d: object) => {
              const point = d as { label: string; location: string }
              return `<div style="
                background: rgba(10,10,10,0.92);
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 13px;
                color: white;
                border: 1px solid rgba(153,177,105,0.4);
                backdrop-filter: blur(12px);
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.4;
                max-width: 220px;
              ">
                <div style="font-weight: 600;">${point.label}</div>
                ${point.location ? `<div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 2px;">${point.location}</div>` : ''}
              </div>`
            }}
            enablePointerInteraction={true}
            animateIn={true}
            width={dimensions.width}
            height={dimensions.height}
          />
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Globe className="h-8 w-8 text-stone-600" />
            </div>
            <p className="text-stone-500 text-sm font-medium">No locations yet</p>
            <p className="text-stone-600 text-xs">Adventures are waiting</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Globe className="h-8 w-8 text-olive-500/30" />
              </div>
              <Globe className="h-8 w-8 text-olive-500 animate-pulse" />
            </div>
            <p className="text-stone-500 text-xs">Loading globe...</p>
          </div>
        )}
      </div>

      {/* Overlay UI — fades in after globe is ready */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{ opacity: globeReady || locations.length === 0 ? 1 : 0 }}
      >
        {/* Top-left: User identity badge */}
        <div className="absolute top-3 left-3 pointer-events-auto">
          <Link
            href={`${appUrl}/u/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer flex items-center gap-2.5 bg-black/70 backdrop-blur-2xl rounded-xl px-3 py-2 border border-white/[0.08] hover:border-olive-500/40 transition-all duration-200 group shadow-2xl hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-olive-500/30 to-olive-600/10 border border-olive-500/20 flex items-center justify-center">
              <Plane className="h-3.5 w-3.5 text-olive-400 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-white/40 leading-tight">@{username}</span>
            </div>
          </Link>
        </div>

        {/* Top-right: Stats pills */}
        <div className="absolute top-3 right-3 pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="bg-black/70 backdrop-blur-2xl rounded-lg px-2.5 py-1.5 border border-white/[0.08] flex items-center gap-1.5 shadow-2xl">
              <MapPin className="h-3 w-3 text-olive-400" />
              <span className="text-[12px] font-medium text-white/70 tabular-nums">
                {locations.length}
              </span>
            </div>
            {countryCodes.length > 0 && (
              <div className="bg-black/70 backdrop-blur-2xl rounded-lg px-2.5 py-1.5 border border-white/[0.08] flex items-center gap-1.5 shadow-2xl">
                <Globe className="h-3 w-3 text-olive-400" />
                <span className="text-[12px] font-medium text-white/70 tabular-nums">
                  {countryCodes.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar: Flags + branding */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-3">
            <div className="flex items-end justify-between gap-3">
              {/* Country flags strip */}
              {countryCodes.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {countryCodes.slice(0, 20).map(code => (
                    <span
                      key={code}
                      className="text-base leading-none"
                      title={code}
                    >
                      {countryCodeToFlag(code)}
                    </span>
                  ))}
                  {countryCodes.length > 20 && (
                    <span className="text-[10px] text-white/30 ml-0.5 font-medium">
                      +{countryCodes.length - 20}
                    </span>
                  )}
                </div>
              )}

              {/* Branding */}
              <Link
                href={`${appUrl}/u/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer shrink-0 flex items-center gap-1.5 text-[11px] text-white/30 hover:text-olive-400 transition-colors duration-200 font-medium focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-sm"
              >
                <Globe className="h-3 w-3" />
                Adventure Log
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
