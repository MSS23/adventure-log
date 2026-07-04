'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Globe as GlobeIcon, MapPin, ArrowRight, Maximize2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

// react-globe.gl compiles GLSL shaders at runtime (three.js) — must be
// client-only. Loaded the same way the main globe and embed globe are.
const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => null,
})

export interface ProfileGlobeLocation {
  id: string
  title: string
  location: string
  country_code: string
  lat: number
  lng: number
}

interface ProfileGlobeProps {
  /** Username of the profile owner — used for the anonymous full-globe fallback. */
  username: string
  /** UUID of the profile owner — used for the authenticated /globe?user= link. */
  targetUserId: string
  /** Album locations to pin. Each pin links to its public album page. */
  locations: ProfileGlobeLocation[]
  /** Extra classes for the outer wrapper. */
  className?: string
}

/**
 * Embedded interactive travel globe for a user's public profile.
 *
 * Mirrors the look of the main `/globe` page (same earth texture + atmosphere)
 * but is intentionally self-contained: it renders from the `locations` passed
 * by the server component, so it works for logged-out visitors without any
 * client-side authenticated fetch.
 *
 * Interaction:
 *   - Click a location pin  → open that album on the owner's profile
 *     (`/albums/<id>/public`).
 *   - Click the globe itself → open the full-screen globe experience for the
 *     owner. Signed-in visitors get the rich in-app globe (`/globe?user=<id>`);
 *     anonymous visitors get the public embed globe (`/embed/<username>`).
 *
 * A keyboard-accessible "Explore globe" button provides the same navigation as
 * clicking the canvas (a 3D canvas click isn't focusable), and the album grid
 * below the globe remains the accessible way to reach albums.
 */
export function ProfileGlobe({
  username,
  targetUserId,
  locations,
  className,
}: ProfileGlobeProps) {
  const router = useRouter()
  const { user } = useAuth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Higher-res texture on desktop, lighter one on mobile — matches the main
  // globe's performance heuristic.
  const globeImageUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return '/earth-texture.jpg'
    }
    return '/earth-texture-4k.jpg'
  }, [])

  // Full-globe destination depends on auth: signed-in visitors can reach the
  // protected in-app globe; anonymous visitors fall back to the public embed.
  const fullGlobeHref = user
    ? `/globe?user=${targetUserId}`
    : `/embed/${username}`

  const goToFullGlobe = useCallback(() => {
    router.push(fullGlobeHref)
  }, [router, fullGlobeHref])

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      })
    }
  }, [])

  useEffect(() => {
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [updateDimensions])

  // Center the view on the traveler's footprint and start a gentle auto-rotate
  // once the globe is mounted.
  useEffect(() => {
    if (!mounted || !globeRef.current || locations.length === 0) return

    const timer = setTimeout(() => {
      if (!globeRef.current) return
      const avgLat =
        locations.reduce((sum, l) => sum + l.lat, 0) / locations.length
      const avgLng =
        locations.reduce((sum, l) => sum + l.lng, 0) / locations.length
      globeRef.current.pointOfView(
        { lat: avgLat, lng: avgLng, altitude: 2.2 },
        1500,
      )

      const controls = globeRef.current.controls()
      if (controls) {
        // Pure teaser: auto-rotate only. Disabling manual zoom/pan/rotate keeps
        // the interaction unambiguous — a click on empty globe always means
        // "open the full globe" (never a drag mistaken for a click), while
        // pins remain individually clickable to open their album.
        controls.enableZoom = false
        controls.enablePan = false
        controls.enableRotate = false
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.4
      }
      setGlobeReady(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [mounted, locations])

  const pinData = useMemo(
    () =>
      locations.map((loc) => ({
        lat: loc.lat,
        lng: loc.lng,
        size: 0.55,
        color: '#F2A179',
        id: loc.id,
        label: loc.title,
        location: loc.location,
      })),
    [locations],
  )

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as { id?: string }
      if (p.id) router.push(`/albums/${p.id}/public`)
    },
    [router],
  )

  const hasLocations = locations.length > 0

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-border ${className ?? ''}`}
    >
      {/* Globe canvas */}
      <div
        ref={containerRef}
        className="relative h-72 md:h-96 bg-[#0a0a0a]"
        role="img"
        aria-label={`Interactive travel globe: ${locations.length} ${locations.length === 1 ? 'location' : 'locations'} pinned`}
      >
        {mounted && hasLocations && dimensions.width > 0 ? (
          <GlobeGL
            ref={globeRef}
            globeImageUrl={globeImageUrl}
            bumpImageUrl="/earth-topology.png"
            backgroundImageUrl={undefined}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="rgb(135, 206, 250)"
            atmosphereAltitude={0.15}
            pointsData={pinData}
            pointAltitude={0.02}
            pointRadius={0.45}
            pointColor={() => '#F2A179'}
            pointLabel={(d: object) => {
              const point = d as { label: string; location: string }
              return `<div style="
                background: rgba(10,10,10,0.92);
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 13px;
                color: white;
                border: 1px solid rgba(242,161,121,0.5);
                backdrop-filter: blur(12px);
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.4;
                max-width: 220px;
                cursor: pointer;
              ">
                <div style="font-weight: 600;">${point.label}</div>
                ${point.location ? `<div style="color: rgba(255,255,255,0.55); font-size: 11px; margin-top: 2px;">${point.location}</div>` : ''}
                <div style="color: rgba(242,161,121,0.9); font-size: 10px; margin-top: 4px;">Open album →</div>
              </div>`
            }}
            onPointClick={handlePointClick}
            onGlobeClick={goToFullGlobe}
            enablePointerInteraction={true}
            animateIn={true}
            width={dimensions.width}
            height={dimensions.height}
          />
        ) : hasLocations ? (
          // Mounting / measuring
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <GlobeIcon className="h-8 w-8 text-primary/30" />
              </div>
              <GlobeIcon className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-white/50 text-xs">Loading globe…</p>
          </div>
        ) : (
          // No located albums
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <GlobeIcon className="h-7 w-7 text-white/40" />
            </div>
            <p className="text-white/50 text-sm font-medium">
              No mapped adventures yet
            </p>
          </div>
        )}

        {/* Overlay UI — fades in with the globe */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{ opacity: globeReady || !hasLocations ? 1 : 0 }}
        >
          {/* Pin count pill */}
          {hasLocations && (
            <div className="absolute top-3 left-3">
              <div className="bg-black/70 backdrop-blur-2xl rounded-lg px-2.5 py-1.5 border border-white/[0.08] flex items-center gap-1.5 shadow-xl">
                <MapPin className="h-3 w-3 text-[#F2A179]" />
                <span className="text-[12px] font-medium text-white/70 tabular-nums">
                  {locations.length}
                </span>
              </div>
            </div>
          )}

          {/* Hint */}
          {hasLocations && (
            <div className="absolute bottom-3 left-3">
              <p className="text-[11px] text-white/45 bg-black/40 backdrop-blur-md rounded-md px-2 py-1">
                Tap a pin to open the album
              </p>
            </div>
          )}

          {/* Accessible "explore" control — keyboard reachable, unlike a canvas click */}
          <div className="absolute bottom-3 right-3 pointer-events-auto">
            <button
              type="button"
              onClick={goToFullGlobe}
              className="cursor-pointer flex items-center gap-1.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-xl px-3 py-2 shadow-lg transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-[0.97]"
              aria-label={`Explore ${username}'s full travel globe`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Explore globe
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
