'use client'

import { useMemo, useState } from 'react'
import { WORLD_DOTS } from '@/components/explore/world-map-dots'

/**
 * Flat "countries visited" map for the passport page. Renders the shared dotted
 * equirectangular world base (same projection as FriendsMapSection) and marks
 * each visited country with a mesh-grid-patterned highlight + glow.
 *
 * This is a 2D SVG surface — intentionally separate from the 3D globe.
 */

interface VisitedAlbum {
  country_code: string | null
  latitude: number
  longitude: number
}

// Equirectangular projection — identical to FriendsMapSection so everything
// lines up on the same 800×400 viewBox.
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * 800,
    y: ((90 - lat) / 180) * 400,
  }
}

export function PassportWorldMap({
  albums,
  countryNames,
}: {
  albums: VisitedAlbum[]
  countryNames: Record<string, string>
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  // One representative point per visited country (mean of its albums' coords).
  const countries = useMemo(() => {
    const acc = new Map<string, { lat: number; lng: number; n: number }>()
    for (const a of albums) {
      const code = a.country_code?.toUpperCase()
      if (!code || a.latitude == null || a.longitude == null) continue
      const cur = acc.get(code) || { lat: 0, lng: 0, n: 0 }
      cur.lat += a.latitude
      cur.lng += a.longitude
      cur.n += 1
      acc.set(code, cur)
    }
    return [...acc.entries()].map(([code, v]) => ({
      code,
      ...geoToSvg(v.lat / v.n, v.lng / v.n),
    }))
  }, [albums])

  if (countries.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative bg-muted/40">
        <svg
          viewBox="0 0 800 400"
          className="w-full"
          style={{ height: 'clamp(190px, 30vw, 280px)' }}
          role="img"
          aria-label={`World map highlighting ${countries.length} visited ${countries.length === 1 ? 'country' : 'countries'}`}
        >
          <defs>
            {/* Mesh grid used to fill the visited-country highlights */}
            <pattern id="passport-mesh" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M6 0H0V6" fill="none" stroke="var(--color-coral)" strokeWidth="0.7" />
            </pattern>
            <radialGradient id="passport-visited-glow">
              <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Faint land dots (the base map) */}
          <g className="text-foreground/20" fill="currentColor">
            {Array.from({ length: WORLD_DOTS.length / 2 }, (_, i) => (
              <circle key={i} cx={WORLD_DOTS[i * 2]} cy={WORLD_DOTS[i * 2 + 1]} r={1.4} />
            ))}
          </g>

          {/* Visited-country highlights — mesh-filled marker + soft glow */}
          {countries.map((c) => {
            const isHovered = hovered === c.code
            return (
              <g
                key={c.code}
                onMouseEnter={() => setHovered(c.code)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 28 : 22}
                  fill="url(#passport-visited-glow)"
                  className="transition-all duration-300"
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 8.5 : 7}
                  fill="url(#passport-mesh)"
                  stroke="var(--color-coral)"
                  strokeWidth={1.2}
                  className="transition-all duration-300"
                />
              </g>
            )
          })}
        </svg>

        {/* Hover label */}
        {hovered &&
          (() => {
            const c = countries.find((x) => x.code === hovered)
            if (!c) return null
            return (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: `${(c.x / 800) * 100}%`,
                  top: `${(c.y / 400) * 100}%`,
                  transform: 'translate(-50%, calc(-100% - 10px))',
                }}
              >
                <div className="whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md">
                  {countryNames[hovered] || hovered}
                </div>
              </div>
            )
          })()}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Countries visited</span>
        <span className="font-mono text-[11px] tabular-nums tracking-wide text-foreground">
          {countries.length}
        </span>
      </div>
    </div>
  )
}
