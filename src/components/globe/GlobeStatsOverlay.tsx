'use client'

import { MapPin, Camera, Globe2, Route } from 'lucide-react'

interface GlobeStatsOverlayProps {
  stats: { totalAlbums: number; totalCountries: number; totalPhotos: number }
  totalDistance: number
  formatDistance: (km: number) => string
}

export function GlobeStatsOverlay({
  stats,
  totalDistance,
  formatDistance,
}: GlobeStatsOverlayProps) {
  return (
    <>
      {/* Desktop stats card - above the compact filmstrip. Desktop-only by
          design: on phones this was one floating layer too many (controls +
          stats FAB + filmstrip over one small globe) — the same numbers live
          on the profile and passport pages. */}
      <div className="hidden md:block absolute bottom-[105px] left-4 z-10">
        <div className="bg-card/85 backdrop-blur-xl rounded-xl border border-border p-3.5 w-48 shadow-2xl">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Travel Stats</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground flex items-center gap-1.5">
                <Globe2 className="h-3 w-3 text-olive-500" /> Countries
              </span>
              <span className="text-sm font-bold text-foreground">{stats.totalCountries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-olive-500" /> Adventures
              </span>
              <span className="text-sm font-bold text-foreground">{stats.totalAlbums}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground flex items-center gap-1.5">
                <Camera className="h-3 w-3 text-olive-500" /> Photos
              </span>
              <span className="text-sm font-bold text-foreground">{stats.totalPhotos}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-[11px] text-foreground flex items-center gap-1.5">
                <Route className="h-3 w-3 text-olive-500" /> Distance
              </span>
              <span className="text-sm font-bold text-foreground">{formatDistance(totalDistance)}</span>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
