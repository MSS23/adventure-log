'use client'

import { MapPin, Camera, Globe2, Route, BarChart3 } from 'lucide-react'

interface GlobeStatsOverlayProps {
  stats: { totalAlbums: number; totalCountries: number; totalPhotos: number }
  totalDistance: number
  formatDistance: (km: number) => string
  showStatsOverlay: boolean
  setShowStatsOverlay: (show: boolean) => void
}

export function GlobeStatsOverlay({
  stats,
  totalDistance,
  formatDistance,
  showStatsOverlay,
  setShowStatsOverlay,
}: GlobeStatsOverlayProps) {
  return (
    <>
      {/* Desktop stats card - above the compact filmstrip */}
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

      {/* Mobile stats toggle button + panel - sits above the album strip */}
      <div className="md:hidden absolute bottom-[100px] left-3 z-10">
        {showStatsOverlay ? (
          <div className="bg-card/85 backdrop-blur-xl rounded-xl border border-border p-3 w-44 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stats</h3>
              <button
                type="button"
                onClick={() => setShowStatsOverlay(false)}
                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer transition-colors duration-200 py-1 px-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
              >
                close
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground flex items-center gap-1.5">
                  <Globe2 className="h-3 w-3 text-olive-500" /> Countries
                </span>
                <span className="text-xs font-bold text-foreground">{stats.totalCountries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-olive-500" /> Adventures
                </span>
                <span className="text-xs font-bold text-foreground">{stats.totalAlbums}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-olive-500" /> Photos
                </span>
                <span className="text-xs font-bold text-foreground">{stats.totalPhotos}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-foreground flex items-center gap-1.5">
                  <Route className="h-3 w-3 text-olive-500" /> Distance
                </span>
                <span className="text-xs font-bold text-foreground">{formatDistance(totalDistance)}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Show travel stats"
            onClick={() => setShowStatsOverlay(true)}
            className="bg-card/85 backdrop-blur-xl rounded-full p-2.5 border border-border shadow-lg hover:bg-card transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            title="Show travel stats"
          >
            <BarChart3 className="h-4 w-4 text-olive-500" />
          </button>
        )}
      </div>
    </>
  )
}
