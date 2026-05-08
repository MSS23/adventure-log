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
        <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-white/[0.08] p-3.5 w-48 shadow-2xl">
          <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2.5">Travel Stats</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                <Globe2 className="h-3 w-3 text-olive-400" /> Countries
              </span>
              <span className="text-sm font-bold text-white">{stats.totalCountries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-olive-400" /> Adventures
              </span>
              <span className="text-sm font-bold text-white">{stats.totalAlbums}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                <Camera className="h-3 w-3 text-olive-400" /> Photos
              </span>
              <span className="text-sm font-bold text-white">{stats.totalPhotos}</span>
            </div>
            <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
              <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                <Route className="h-3 w-3 text-olive-400" /> Distance
              </span>
              <span className="text-sm font-bold text-white">{formatDistance(totalDistance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stats toggle button + panel - sits above the album strip */}
      <div className="md:hidden absolute bottom-[100px] left-3 z-10">
        {showStatsOverlay ? (
          <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-white/[0.08] p-3 w-44 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Stats</h3>
              <button
                onClick={() => setShowStatsOverlay(false)}
                className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors duration-200 py-1 px-1.5 rounded"
              >
                close
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Globe2 className="h-3 w-3 text-olive-400" /> Countries
                </span>
                <span className="text-xs font-bold text-white">{stats.totalCountries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-olive-400" /> Adventures
                </span>
                <span className="text-xs font-bold text-white">{stats.totalAlbums}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-olive-400" /> Photos
                </span>
                <span className="text-xs font-bold text-white">{stats.totalPhotos}</span>
              </div>
              <div className="border-t border-white/[0.06] pt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Route className="h-3 w-3 text-olive-400" /> Distance
                </span>
                <span className="text-xs font-bold text-white">{formatDistance(totalDistance)}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowStatsOverlay(true)}
            className="bg-black/60 backdrop-blur-xl rounded-full p-2.5 border border-white/[0.08] shadow-lg hover:bg-black/70 transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-olive-500"
            title="Show travel stats"
          >
            <BarChart3 className="h-4 w-4 text-olive-400" />
          </button>
        )}
      </div>
    </>
  )
}
