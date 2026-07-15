'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Globe as GlobeIcon, MapPin, ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { localizePath } from '@/lib/utils/native-routes'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

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
  /** Travel date (date_start/created_at) — used to order journey chains. */
  date?: string
  /** Explicit journey link (albums.connected_from_album_id, migration 75). */
  connectedFromAlbumId?: string | null
}

interface ProfileGlobeProps {
  /** Username of the profile owner — used for the anonymous full-globe fallback. */
  username: string
  /** UUID of the profile owner — used for the authenticated /globe?user= link. */
  targetUserId: string
  /** Album locations to pin. Each pin links to its album page. */
  locations: ProfileGlobeLocation[]
  /** Extra classes for the outer wrapper. */
  className?: string
}

// Travel arc between two stops — same "home hub" journey model as the main
// globe (useGlobeState.staticConnections), reduced to what the teaser needs.
interface ProfileArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  kind: 'home' | 'journey'
  distance: number
  index: number
  total: number
}

// Mirrors EnhancedGlobe's arcColorAccessor: home legs get the warm amber→rose
// "lines home" gradient; journey legs cycle the same muted palette.
const arcColorAccessor = (d: object) => {
  const arc = d as ProfileArc
  if (arc.kind === 'home') {
    return ['rgba(251,191,36,0.85)', 'rgba(244,114,182,0.45)']
  }
  const progress = arc.total > 1 ? arc.index / (arc.total - 1) : 0.5
  const colors = [
    ['rgba(124,154,62,0.8)', 'rgba(153,177,105,0.4)'],
    ['rgba(196,175,93,0.8)', 'rgba(218,200,130,0.4)'],
    ['rgba(99,206,180,0.75)', 'rgba(134,220,200,0.35)'],
    ['rgba(147,165,220,0.75)', 'rgba(170,185,235,0.35)'],
  ]
  const idx = Math.floor(progress * (colors.length - 1))
  const pair = colors[Math.min(idx, colors.length - 1)]
  return [pair[0], pair[1]]
}

const arcAltitudeAccessor = (d: object) => {
  const arc = d as ProfileArc
  return 0.08 + Math.min(arc.distance / 90, 1) * 0.45
}

const arcDashAnimateTimeAccessor = (d: object) => {
  const arc = d as ProfileArc
  return 3000 + Math.min(arc.distance / 60, 1) * 3000
}

const arcDashAnimateTimeStaticAccessor = () => 0

const arcDashInitialGapAccessor = (d: object) => {
  const arc = d as ProfileArc
  return (arc.index * 0.37) % 1
}

/**
 * Embedded interactive travel globe for a user's profile.
 *
 * Mirrors the look of the main `/globe` page (same earth texture, atmosphere,
 * and travel-line "spider's web") but is intentionally self-contained: it
 * renders from the `locations` passed in, so it works for logged-out visitors
 * without any client-side authenticated fetch.
 *
 * Interaction:
 *   - Click a location pin  → open that album.
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
  const prefersReducedMotion = useReducedMotion()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [homeLocation, setHomeLocation] = useState<{
    lat: number
    lng: number
    name: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Owner's opted-in base location (migration 77): the RPC only returns
  // coordinates when the owner set home_location_is_public, so a private
  // base never reaches this component. With a base, every journey anchors
  // to home (the "spider's web" hub); without one, only explicit
  // trip→trip legs are drawn — same rules as the main globe.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .rpc('get_public_home_location', { p_user_id: targetUserId })
      .then(({ data, error }) => {
        if (cancelled || error) return
        const row = (data as Array<{
          home_city: string | null
          home_country: string | null
          home_latitude: number | null
          home_longitude: number | null
        }> | null)?.[0]
        if (row && row.home_latitude != null && row.home_longitude != null) {
          setHomeLocation({
            lat: row.home_latitude,
            lng: row.home_longitude,
            name: row.home_city || row.home_country || 'Home',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [targetUserId])

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
    router.push(localizePath(fullGlobeHref))
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
        id: loc.id,
        label: loc.title,
        location: loc.location,
      })),
    [locations],
  )

  // Travel lines ("spider's web") — the same home-hub journey model as the
  // main globe: explicit connected_from chains form journeys; with a public
  // base every journey loops home (home→first, legs, last→home), without one
  // only the explicit legs are drawn.
  const arcsData = useMemo<ProfileArc[]>(() => {
    if (locations.length === 0) return []

    const byId = new Map(locations.map((loc) => [loc.id, loc]))
    const timeOf = (loc: ProfileGlobeLocation) =>
      loc.date ? new Date(loc.date).getTime() : 0

    const arcs: ProfileArc[] = []
    const pushArc = (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number },
      kind: 'home' | 'journey',
    ) => {
      const dLat = to.lat - from.lat
      const dLng = to.lng - from.lng
      arcs.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        kind,
        distance: Math.sqrt(dLat * dLat + dLng * dLng),
        index: arcs.length,
        total: 0, // filled in below once the count is known
      })
    }

    const predecessorInView = (loc: ProfileGlobeLocation) => {
      const fromId = loc.connectedFromAlbumId
      return !!(fromId && fromId !== loc.id && byId.has(fromId))
    }

    // successorsOf: predecessor id → trips that continue from it.
    const successorsOf = new Map<string, ProfileGlobeLocation[]>()
    for (const loc of locations) {
      if (!predecessorInView(loc)) continue
      const fromId = loc.connectedFromAlbumId as string
      const list = successorsOf.get(fromId)
      if (list) list.push(loc)
      else successorsOf.set(fromId, [loc])
    }

    // Journey heads = trips with no predecessor in view, oldest first.
    const heads = locations
      .filter((loc) => !predecessorInView(loc))
      .sort((a, b) => timeOf(a) - timeOf(b))

    const visited = new Set<string>()
    for (const head of heads) {
      if (visited.has(head.id)) continue

      const chain: ProfileGlobeLocation[] = []
      let cur: ProfileGlobeLocation | undefined = head
      while (cur && !visited.has(cur.id)) {
        visited.add(cur.id)
        chain.push(cur)
        const next = (successorsOf.get(cur.id) || [])
          .filter((s) => !visited.has(s.id))
          .sort((a, b) => timeOf(a) - timeOf(b))
        cur = next[0]
      }

      const first = chain[0]
      const last = chain[chain.length - 1]

      if (homeLocation) {
        pushArc(homeLocation, first, 'home')
      }
      for (let i = 0; i < chain.length - 1; i++) {
        pushArc(chain[i], chain[i + 1], 'journey')
      }
      if (homeLocation && chain.length >= 2) {
        pushArc(last, homeLocation, 'home')
      }
    }

    for (const arc of arcs) arc.total = arcs.length
    return arcs
  }, [locations, homeLocation])

  const openAlbum = useCallback(
    (albumId: string) => {
      // Signed-in viewers get the in-app album page; anonymous visitors the
      // public share view (the in-app route would bounce them to /login).
      router.push(localizePath(user ? `/albums/${albumId}` : `/albums/${albumId}/public`))
    },
    [router, user],
  )

  // DOM-backed pins have a dependable 44px hit target. The old WebGL points
  // were visually small and did not expose useful keyboard semantics.
  const profilePinElement = useCallback(
    (point: object) => {
      const pin = point as { id: string; label: string; location: string }
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'profile-globe-pin'
      button.setAttribute(
        'aria-label',
        `Open album: ${pin.label}${pin.location ? `, ${pin.location}` : ''}`,
      )
      button.title = pin.location ? `${pin.label} · ${pin.location}` : pin.label

      const marker = document.createElement('span')
      marker.className = 'profile-globe-pin__marker'
      marker.innerHTML = `
        <svg width="34" height="38" viewBox="0 0 34 38" aria-hidden="true" focusable="false">
          <path d="M17 1.5C8.3 1.5 2 7.8 2 15.8 2 25.5 17 36.5 17 36.5s15-11 15-20.7C32 7.8 25.7 1.5 17 1.5Z" fill="white" stroke="rgba(242,161,121,.95)" stroke-width="2"/>
          <circle cx="17" cy="15.5" r="8.5" fill="#F2A179"/>
          <circle cx="17" cy="15.5" r="2.5" fill="white"/>
        </svg>
      `

      const tooltip = document.createElement('span')
      tooltip.className = 'profile-globe-pin__label'
      tooltip.textContent = pin.location ? `${pin.label} · ${pin.location}` : pin.label

      button.append(marker, tooltip)
      button.addEventListener('pointerdown', (event) => event.stopPropagation())
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        openAlbum(pin.id)
      })

      return button
    },
    [openAlbum],
  )

  const hasLocations = locations.length > 0

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-border ${className ?? ''}`}
    >
      {/* Globe canvas */}
      <div
        ref={containerRef}
        className="relative h-72 cursor-pointer bg-[#0a0a0a] md:h-96"
        role="group"
        aria-label={`Travel footprint for @${username}: ${locations.length} ${locations.length === 1 ? 'place' : 'places'}. Select a pin to open its album, or select the globe to explore the full view.`}
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
            htmlElementsData={pinData}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.025}
            htmlElement={profilePinElement}
            arcsData={arcsData}
            arcColor={arcColorAccessor}
            arcAltitude={arcAltitudeAccessor}
            arcStroke={0.4}
            arcDashLength={0.25}
            arcDashGap={0.15}
            arcDashAnimateTime={
              prefersReducedMotion
                ? arcDashAnimateTimeStaticAccessor
                : arcDashAnimateTimeAccessor
            }
            arcDashInitialGap={arcDashInitialGapAccessor}
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
                <span className="text-[12px] font-medium text-white/75 tabular-nums">
                  {locations.length} mapped {locations.length === 1 ? 'place' : 'places'}
                </span>
              </div>
            </div>
          )}

          {/* Hint */}
          {hasLocations && (
            <div className="absolute bottom-3 left-3">
              <p className="text-[11px] text-white/45 bg-black/40 backdrop-blur-md rounded-md px-2 py-1">
                Pins open albums · Tap the globe for the full view
              </p>
            </div>
          )}

          {/* Accessible "explore" control — keyboard reachable, unlike a canvas click */}
          <div className="absolute bottom-3 right-3 pointer-events-auto">
            <button
              type="button"
              onClick={goToFullGlobe}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
              aria-label={`Explore ${username}'s full travel globe`}
            >
              <GlobeIcon className="h-4 w-4" aria-hidden />
              View full globe
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .profile-globe-pin {
          position: relative;
          display: grid;
          width: 44px;
          height: 44px;
          cursor: pointer;
          place-items: center;
          border: 0;
          background: transparent;
          padding: 0;
          pointer-events: auto;
        }
        .profile-globe-pin__marker {
          display: grid;
          place-items: center;
          filter: drop-shadow(0 7px 7px rgba(0, 0, 0, 0.42));
          transform-origin: 50% 100%;
          transition: filter 160ms ease, transform 160ms ease;
        }
        .profile-globe-pin:hover .profile-globe-pin__marker,
        .profile-globe-pin:focus-visible .profile-globe-pin__marker {
          filter: drop-shadow(0 9px 10px rgba(0, 0, 0, 0.58));
          transform: scale(1.12) translateY(-2px);
        }
        .profile-globe-pin:focus-visible {
          border-radius: 999px;
          outline: 2px solid white;
          outline-offset: 2px;
        }
        .profile-globe-pin__label {
          position: absolute;
          bottom: 46px;
          left: 50%;
          z-index: 2;
          width: max-content;
          max-width: 190px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          background: rgba(10, 10, 10, 0.9);
          padding: 7px 10px;
          color: white;
          font: 600 11px/1.35 system-ui, sans-serif;
          opacity: 0;
          pointer-events: none;
          text-overflow: ellipsis;
          transform: translate(-50%, 4px);
          transition: opacity 140ms ease, transform 140ms ease;
          white-space: nowrap;
        }
        .profile-globe-pin:hover .profile-globe-pin__label,
        .profile-globe-pin:focus-visible .profile-globe-pin__label {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        @media (prefers-reduced-motion: reduce) {
          .profile-globe-pin__marker,
          .profile-globe-pin__label {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
