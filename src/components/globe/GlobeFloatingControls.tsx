'use client'

import { Route, Navigation, Loader2, MapPin as LocationIcon, Search, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GlobeFloatingControlsProps {
  showStaticConnections: boolean
  setShowStaticConnections: (show: boolean) => void
  showCurrentLocation: boolean
  currentLocation: { latitude: number; longitude: number; accuracy?: number } | null
  locationLoading: boolean
  locationError: string | null
  permissionStatus: string | null
  onLocationToggle: () => void
  onClearLocation: () => void
  /** Only show the "my location" control on the viewer's own globe — a current
   *  location must never be exposed on another person's globe. */
  showLocationControl?: boolean
  /** Search overlay toggle */
  showSearch: boolean
  setShowSearch: (show: boolean) => void
  /** Journey flight animation — only shown when there are 2+ locations. */
  showPlayControl?: boolean
  isPlaying?: boolean
  onPlayPause?: () => void
}

export function GlobeFloatingControls({
  showStaticConnections,
  setShowStaticConnections,
  showCurrentLocation,
  locationLoading,
  locationError,
  permissionStatus,
  onLocationToggle,
  onClearLocation,
  showLocationControl = true,
  showSearch,
  setShowSearch,
  showPlayControl = false,
  isPlaying = false,
  onPlayPause
}: GlobeFloatingControlsProps) {
  return (
    <>
      {/* Floating Controls - Top Right Only */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <div className="flex items-center gap-1.5 backdrop-blur-xl bg-card/90 rounded-xl p-1.5 shadow-2xl border border-border">
          {/* Play/Pause Journey — flight animation through 2+ locations. The
              after:-inset-1 overlay extends the 36px button to a 44px touch
              target without changing its visual size. */}
          {showPlayControl && onPlayPause && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPlayPause}
              className={cn(
                "relative h-9 w-9 p-0 rounded-lg transition-all after:absolute after:-inset-1 after:content-['']",
                isPlaying ? 'bg-olive-500/30 text-olive-700' : 'text-foreground hover:bg-muted'
              )}
              title={isPlaying ? 'Pause journey' : 'Play journey'}
              aria-label={isPlaying ? 'Pause journey animation' : 'Play journey animation'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}

          {/* Search Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={cn("h-9 w-9 p-0 text-foreground hover:bg-muted rounded-lg transition-all", showSearch && 'bg-olive-500/30 text-olive-700')}
            title="Search locations"
            aria-label={showSearch ? 'Close location search' : 'Search locations'}
            aria-pressed={showSearch}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Travel Routes Toggle — desktop only; on phones it's a niche
              toggle that crowds the control cluster (routes stay visible,
              they just aren't toggleable there). */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStaticConnections(!showStaticConnections)}
            className={cn("hidden md:inline-flex h-9 w-9 p-0 text-foreground hover:bg-muted rounded-lg transition-all", showStaticConnections && 'bg-olive-500/30 text-olive-700')}
            title="Toggle travel routes"
          >
            <Route className="h-4 w-4" />
          </Button>

          {/* Location Permission Button — own globe only */}
          {showLocationControl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLocationToggle}
            disabled={locationLoading || permissionStatus === 'unsupported' || permissionStatus === 'denied'}
            className={cn(
              "h-9 w-9 p-0 rounded-lg transition-all",
              permissionStatus === 'denied' && "opacity-50 cursor-not-allowed",
              showCurrentLocation
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "text-foreground hover:bg-muted",
              (locationLoading || permissionStatus === 'unsupported' || permissionStatus === 'denied') && "hover:bg-muted"
            )}
            title={
              locationLoading
                ? "Detecting location..."
                : permissionStatus === 'denied'
                ? "Location access denied. Enable in browser settings to use this feature."
                : permissionStatus === 'unsupported'
                ? "Location is not supported on this device"
                : showCurrentLocation
                ? "Hide current location"
                : "Show my location"
            }
          >
            {locationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : permissionStatus === 'denied' ? (
              <Navigation className="h-4 w-4 opacity-50" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
          )}
        </div>
      </div>

      {/* Location Error Toast - Auto-dismiss after showing */}
      {locationError && permissionStatus !== 'denied' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="backdrop-blur-xl bg-yellow-500/95 text-white rounded-xl p-4 shadow-2xl border border-yellow-400/20">
            <div className="flex items-start gap-3">
              <LocationIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Location Unavailable</p>
                <p className="text-xs mt-1 opacity-90">{locationError}</p>
                <p className="text-xs mt-2 opacity-75">Try again or search for a location manually.</p>
              </div>
              <button
                type="button"
                onClick={onClearLocation}
                className="flex items-center justify-center min-h-10 min-w-10 rounded-lg text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Info - Persistent */}
      {permissionStatus === 'denied' && locationError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="backdrop-blur-xl bg-red-500/95 text-white rounded-xl p-4 shadow-2xl border border-red-400/20">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-sm">Location Access Blocked</p>
                <p className="text-xs mt-1 opacity-90">Location permission was denied.</p>
                <p className="text-xs mt-2 opacity-90">
                  To enable: Click the <span className="font-semibold">lock icon</span> in your browser&apos;s address bar → Allow location access → Reload the page.
                </p>
              </div>
              <button
                type="button"
                onClick={onClearLocation}
                className="flex items-center justify-center min-h-10 min-w-10 rounded-lg text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
