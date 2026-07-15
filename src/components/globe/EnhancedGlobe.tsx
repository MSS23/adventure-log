'use client'

import { useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeInstance } from '@/types/globe'
import { useCityPinSystem, clusterParamsForAltitude, type CityCluster, type ClusterLevel } from './CityPinSystem'
import { AlbumImageModal } from './AlbumImageModal'
import { GlobeSearch } from './GlobeSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPinElement } from './createPinElement'
import { FlightAnimation } from './FlightAnimation'
import { ArcPlanes } from './ArcPlanes'

// Extracted hooks and sub-components
import { useGlobeState } from './hooks/useGlobeState'
import { GlobeHeader } from './GlobeHeader'
import { GlobeFloatingControls } from './GlobeFloatingControls'
import { GlobeTimeline } from './GlobeTimeline'
import { GlobeSearchHelp } from './GlobeTooltip'

// Shared types
import type { FlightPath, GlobeInternals } from './types'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

/* ── Stable globe accessors ────────────────────────────────────────────────
 * react-globe.gl re-applies a layer whenever an accessor prop changes
 * identity, so anything that doesn't need component state lives at module
 * scope. Rebuilding the HTML pin layer in particular is expensive — each pin
 * is a real DOM element. */

const EMPTY_DATA: object[] = []
const EMPTY_ARC_PLANES: FlightPath[] = []

const htmlLatAccessor = (d: object) => (d as { lat: number }).lat
const htmlLngAccessor = (d: object) => (d as { lng: number }).lng
const htmlAltitudeAccessor = (d: object) => (d as { size: number }).size * 0.01

const ringLatAccessor = (d: object) => (d as { lat: number }).lat
const ringLngAccessor = (d: object) => (d as { lng: number }).lng
const ringColorAccessor = () => 'transparent'

const arcColorAccessor = (d: object) => {
  const path = d as FlightPath
  // Home-hub arcs (base → trip / trip → base) get a distinct warm amber→rose
  // gradient so they read as "lines home" and never blend into the greenish
  // journey legs between connected trips.
  if (path.kind === 'home') {
    return ['rgba(251,191,36,0.85)', 'rgba(244,114,182,0.45)']
  }
  const progress = path.total > 1 ? path.index / (path.total - 1) : 0.5
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
  const path = d as FlightPath
  const minAlt = 0.08
  const distFactor = Math.min(path.distance / 90, 1)
  return minAlt + distFactor * 0.45
}

const arcDashAnimateTimeAccessor = (d: object) => {
  const path = d as FlightPath
  const speedFactor = Math.min(path.distance / 60, 1)
  return 3000 + speedFactor * 3000
}

// Stable accessor for prefers-reduced-motion: 0 disables the dash animation
// (static arcs). Kept at module scope — selecting between this and the
// animated accessor swaps identities only when the preference flips, never
// per-render, so the arc layer isn't rebuilt.
const arcDashAnimateTimeStaticAccessor = () => 0

const arcDashInitialGapAccessor = (d: object) => {
  const path = d as FlightPath
  return (path.index * 0.37) % 1
}
const emptyArcLabelAccessor = () => ''

export interface WishlistPin {
  id: string
  latitude: number
  longitude: number
  location_name: string
}

export interface CommunityPin {
  id: string
  albumId: string
  latitude: number
  longitude: number
  label: string
  albumCount: number
}

interface EnhancedGlobeProps {
  className?: string
  initialAlbumId?: string
  initialLat?: number
  initialLng?: number
  filterUserId?: string
  hideHeader?: boolean
  selectedYear?: number | null
  onYearChange?: (year: number | null) => void
  onGlobeBackgroundClick?: (coords: { lat: number; lng: number; screenX: number; screenY: number }) => void
  wishlistPins?: WishlistPin[]
  onWishlistPinClick?: (wishlistId: string) => void
  communityPins?: CommunityPin[]
  onCommunityPinClick?: (albumId: string) => void
  showCommunityLayer?: boolean
  /** Whether the signed-in viewer owns this globe. The "current location"
   *  (device GPS) pin + toggle are only ever available on your OWN globe, so a
   *  current location is never shown to anyone else. Defaults to false so any
   *  other/public/embedded surface omits it. */
  isOwnProfile?: boolean
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
  getAvailableYears: () => number[]
  getCanvas: () => HTMLCanvasElement | null
  flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => Promise<void>
}

export const EnhancedGlobe = forwardRef<EnhancedGlobeRef, EnhancedGlobeProps>(
  function EnhancedGlobe({ className, initialAlbumId, initialLat, initialLng, filterUserId, hideHeader = false, selectedYear: selectedYearProp, onYearChange: onYearChangeProp, onGlobeBackgroundClick, wishlistPins, onWishlistPinClick, communityPins, onCommunityPinClick, showCommunityLayer = false, isOwnProfile = false }, ref) {

  const state = useGlobeState({
    filterUserId,
    hideHeader,
    selectedYear: selectedYearProp,
    onYearChange: onYearChangeProp,
    initialAlbumId,
    initialLat,
    initialLng,
    onGlobeBackgroundClick,
  })

  const {
    globeRef, modalOpenRef, navigationHandlerRef, availableYearsRef,
    rendererRef, globeContainerRef,
    globeReady, setGlobeReady, selectedCluster, setSelectedCluster,
    showAlbumModal, setShowAlbumModal,
    setIsAutoRotating,
    prefersReducedMotion,
    setUserInteracting,
    showSearch, setShowSearch,
    showStaticConnections, setShowStaticConnections, setArcsKey,
    currentLocationIndex,
    showCurrentLocation, currentLocation,
    locationLoading, locationError, permissionStatus, clearLocation,
    effectivePerformanceMode, performanceConfig, globeImageUrl, rendererConfig,
    shouldRender, windowDimensions,
    calculateOptimalCameraPosition, animateCameraToPosition,
    availableYears, timelineLoading, timelineError,
    effectiveSelectedYear, handleEffectiveYearChange, refreshData, getYearData,
    locations,
    isPlaying, currentFlightState,
    handleYearChange, handlePlayPause, handleSearchResult,
    handleCityClick, handleClusterClick, handleLocationToggle,
    searchData, travelStats, getYearColor, cityPins, staticConnections,
    homeLocation,
  } = state

  // Expose navigation and year data methods to parent component
  useImperativeHandle(ref, () => ({
    navigateToAlbum: (albumId: string, lat: number, lng: number) => {
      navigationHandlerRef.current?.(albumId, lat, lng)
    },
    getAvailableYears: () => availableYearsRef.current,
    getCanvas: () => {
      const container = globeContainerRef.current
      if (!container) return null
      return container.querySelector('canvas') as HTMLCanvasElement | null
    },
    flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => {
      return new Promise<void>((resolve) => {
        if (!globeRef.current) {
          resolve()
          return
        }
        globeRef.current.pointOfView({ lat, lng, altitude }, durationMs)
        setTimeout(resolve, durationMs)
      })
    }
  }), [globeContainerRef, navigationHandlerRef, availableYearsRef, globeRef])

  // Zoom-aware clustering: track the clustering BAND (radius + level), not the
  // raw camera altitude. Bands only change at a handful of thresholds, so a
  // whole inertial zoom within one band causes zero re-renders — and the
  // (expensive) HTML pin elements only rebuild when clustering actually
  // changes.
  const [clusterBand, setClusterBand] = useState<{ radiusDeg: number; level: ClusterLevel }>(
    () => clusterParamsForAltitude(2.5)
  )
  const lastZoomTickRef = useRef<number>(0)

  const handleZoom = useCallback((pov: { lat: number; lng: number; altitude: number }) => {
    const altitude = pov?.altitude
    if (!Number.isFinite(altitude)) return

    // Throttle to ~120ms so smooth/inertial zooms don't thrash React.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    if (now - lastZoomTickRef.current < 120) return
    lastZoomTickRef.current = now

    const band = clusterParamsForAltitude(altitude)
    setClusterBand(prev =>
      prev.radiusDeg === band.radiusDeg && prev.level === band.level ? prev : band
    )
  }, [])

  // Memoized city pin system (recomputed only when pins/active/zoom band change)
  const cityPinSystem = useCityPinSystem({
    cities: cityPins,
    onCityClick: handleCityClick,
    onClusterClick: handleClusterClick,
    activeCity: state.activeCityId,
    radiusDeg: clusterBand.radiusDeg,
    level: clusterBand.level
  })

  // Combine city pins with current location pin and any wishlist pins
  const allPinData = useMemo(() => {
    const pins = (showCommunityLayer ? [] : [...cityPinSystem.pinData]) as Array<{
      lat: number;
      lng: number;
      size: number;
      color: string;
      opacity: number;
      cluster?: CityCluster;
      isMultiCity?: boolean;
      isActive?: boolean;
      isCheap?: boolean;
      clusterLevel?: 'far' | 'mid' | 'near';
      isCurrentLocation?: boolean;
      isWishlist?: boolean;
      wishlistId?: string;
      isCommunity?: boolean;
      communityAlbumId?: string;
      isHome?: boolean;
      label: string;
      albumCount: number;
      photoCount: number;
      accuracy?: number;
    }>

    // Home hub pin — the base every travel line radiates from. Present on your
    // own globe whenever you've set a home; on someone else's globe only when
    // they opted in (homeLocation is already gated by the RPC upstream).
    if (homeLocation && !showCommunityLayer) {
      pins.push({
        lat: homeLocation.latitude,
        lng: homeLocation.longitude,
        size: 2.4,
        color: '#f59e0b',
        opacity: 0.96,
        isHome: true,
        label: homeLocation.name || 'Home',
        albumCount: 0,
        photoCount: 0,
      })
    }

    if (currentLocation && showCurrentLocation && isOwnProfile && !showCommunityLayer) {
      pins.push({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        size: 2.5,
        color: '#10b981',
        opacity: 0.95,
        isCurrentLocation: true,
        label: 'Your Location',
        albumCount: 0,
        photoCount: 0,
        accuracy: currentLocation.accuracy
      })
    }

    // Wishlist pins — always rendered with the dashed amber star style so they
    // never get visually confused with album pins. Coordinates colliding with
    // an existing album pin are skipped to avoid stacking.
    if (wishlistPins && wishlistPins.length > 0 && !showCommunityLayer) {
      const epsilon = 0.001
      const occupied = pins.map(p => ({ lat: p.lat, lng: p.lng }))
      for (const item of wishlistPins) {
        const collides = occupied.some(p =>
          Math.abs(p.lat - item.latitude) < epsilon &&
          Math.abs(p.lng - item.longitude) < epsilon
        )
        if (collides) continue
        pins.push({
          lat: item.latitude,
          lng: item.longitude,
          size: 2.0,
          color: '#fbbf24',
          opacity: 0.9,
          isWishlist: true,
          wishlistId: item.id,
          label: item.location_name,
          albumCount: 0,
          photoCount: 0,
        })
      }
    }


    // Explore mode intentionally shows one representative pin per country at
    // world zoom. The count communicates depth; clicking opens that country's
    // highest-ranked album for the selected period.
    for (const item of communityPins || []) {
      pins.push({
        lat: item.latitude,
        lng: item.longitude,
        size: 2.3,
        color: '#2F876E',
        opacity: 0.96,
        isCommunity: true,
        communityAlbumId: item.albumId,
        label: item.label,
        albumCount: item.albumCount,
        photoCount: 0,
      })
    }

    return pins
    // isOwnProfile gates the current-location pin above — omitting it here
    // left a stale GPS pin visible after switching to someone else's globe.
  }, [cityPinSystem.pinData, currentLocation, showCurrentLocation, wishlistPins, communityPins, showCommunityLayer, isOwnProfile, homeLocation])

  // Pin DOM factory — memoized so three-globe doesn't regenerate every pin
  // element whenever this component re-renders for unrelated reasons.
  const htmlElementFactory = useCallback((d: object) => createPinElement(d, {
    locations,
    getYearColor,
    cityPins,
    cityPinSystem,
    handleCityClick,
    onWishlistPinClick,
    onCommunityPinClick,
  }), [locations, getYearColor, cityPins, cityPinSystem, handleCityClick, onWishlistPinClick, onCommunityPinClick])

  const arcStrokeAccessor = useCallback((d: object) => {
    const path = d as FlightPath
    const recency = path.total > 1 ? (path.index / (path.total - 1)) : 1
    return performanceConfig.arcStroke * (0.7 + recency * 0.5)
  }, [performanceConfig.arcStroke])

  // Set navigation handler for imperative handle
  navigationHandlerRef.current = (albumId: string, lat: number, lng: number) => {
    const city = cityPins.find(pin => pin.id === albumId)

    if (city && globeReady) {
      // Filmstrip/imperative navigation: fly + select. On desktop the page
      // shows the GlobeSidePanel for the selected album, so we don't also open
      // the bottom preview. On mobile there is no side panel (the old
      // MobileFeaturedAlbum "View" card was removed to stop two cards stacking),
      // so the AlbumImageModal is the single album card and must open here.
      const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 1024
      handleCityClick(city, isMobileViewport)
    } else if (globeReady) {
      setIsAutoRotating(false)
      if (globeRef.current) {
        animateCameraToPosition({
          lat,
          lng,
          altitude: 2.8
        }, 1200, 'easeInOutCubic')
      }
    }
  }

  if (timelineLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-olive-600" />
          <h2 className="text-xl font-semibold mt-4">Loading your travel timeline...</h2>
          <p className="text-stone-800 mt-2">Preparing flight animation data</p>
        </div>
      </div>
    )
  }

  return (
    <div className={hideHeader ? `absolute inset-0 flex flex-col ${className}` : `space-y-6 ${className}`}>
      {/* Single Location Animations */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .globe-pin:hover .single-location-tooltip {
          opacity: 1 !important;
        }
      `}</style>

      {/* Header - Only show when not embedded */}
      {!hideHeader && (
        <GlobeHeader
          locationsCount={locations.length}
          clustersCount={cityPinSystem.clusters.length}
          totalAlbums={cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0)}
          totalPhotos={cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0)}
          availableYearsCount={availableYears.length}
          travelStats={travelStats}
          filterUserId={filterUserId}
        />
      )}

      {/* Globe Container with Floating Controls */}
      <div className="relative flex-1 h-full bg-gradient-to-br from-stone-900 via-slate-800 to-stone-900 rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
        <GlobeFloatingControls
          showStaticConnections={showStaticConnections}
          setShowStaticConnections={setShowStaticConnections}
          showCurrentLocation={showCurrentLocation}
          currentLocation={currentLocation}
          locationLoading={locationLoading}
          locationError={locationError}
          permissionStatus={permissionStatus}
          onLocationToggle={handleLocationToggle}
          onClearLocation={() => clearLocation()}
          showLocationControl={isOwnProfile}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          showPlayControl={locations.length >= 2}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
        />

        {/* Floating search overlay — lives inside the globe container so it is
            reachable in embedded (hideHeader) mode too. z-40 sits above the
            canvas and the z-30 floating controls; top-16 clears the controls
            row on narrow screens. */}
        {showSearch && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
            <GlobeSearch
              data={searchData}
              onResultClick={handleSearchResult}
              onClearSearch={() => setShowSearch(false)}
              className="w-full"
            />
          </div>
        )}

      {/* Error Message */}
      {timelineError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Unable to load travel timeline</p>
              <p className="text-red-500 text-sm mt-1">{timelineError}</p>
              <Button variant="outline" onClick={refreshData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Controls - Only show when not embedded */}
      {!hideHeader && (
        <GlobeTimeline
          availableYears={availableYears}
          effectiveSelectedYear={effectiveSelectedYear}
          handleYearChange={handleYearChange}
          handleEffectiveYearChange={handleEffectiveYearChange}
          getYearData={getYearData}
          locations={locations}
          currentLocationIndex={currentLocationIndex}
        />
      )}

        {/* Globe */}
        <div
          ref={globeContainerRef}
          className={cn(
            "globe-container overflow-hidden relative flex items-center justify-center",
            hideHeader ? "flex-1 w-full h-full" : "rounded-2xl w-full h-full"
          )}
          style={hideHeader ? { minHeight: '100%', height: '100%' } : { contain: 'layout size' }}>
                <Globe
                  ref={globeRef}
                  globeImageUrl={globeImageUrl}
                  bumpImageUrl="/earth-topology.png"
                  backgroundImageUrl={undefined}
                  backgroundColor="rgba(15, 23, 42, 1)"
                  width={windowDimensions.width}
                  height={windowDimensions.height}
                  showAtmosphere={performanceConfig.showAtmosphere}
                  atmosphereColor="rgb(135, 206, 250)"
                  atmosphereAltitude={performanceConfig.atmosphereAltitude}

                  // Enhanced interaction handling
                  onGlobeClick={(globalPoint, event) => {
                    if (event && !(event.target as HTMLElement)?.closest('.globe-pin')) {
                      setUserInteracting(true)
                      setIsAutoRotating(false)
                      setTimeout(() => {
                        setUserInteracting(false)
                      }, 2000)

                      if (onGlobeBackgroundClick && globalPoint) {
                        const mouseEvent = event as MouseEvent
                        onGlobeBackgroundClick({
                          lat: (globalPoint as { lat: number }).lat,
                          lng: (globalPoint as { lng: number }).lng,
                          screenX: mouseEvent?.clientX ?? 0,
                          screenY: mouseEvent?.clientY ?? 0,
                        })
                      }
                    }
                  }}

                  enablePointerInteraction={true}
                  rendererConfig={rendererConfig}

                  // Zoom-aware clustering: recompute cluster radius as the
                  // camera altitude changes (throttled in handleZoom).
                  onZoom={handleZoom}

                  // City pins + current location pin
                  htmlElementsData={allPinData}
                  htmlLat={htmlLatAccessor}
                  htmlLng={htmlLngAccessor}
                  htmlAltitude={htmlAltitudeAccessor}
                  htmlElement={htmlElementFactory}

                  // Animation rings disabled for performance
                  ringsData={EMPTY_DATA}
                  ringLat={ringLatAccessor}
                  ringLng={ringLngAccessor}
                  ringMaxRadius={0}
                  ringPropagationSpeed={0}
                  ringRepeatPeriod={0}
                  ringColor={ringColorAccessor}

                  // Animated travel arcs with moving dash
                  arcsData={!showCommunityLayer && performanceConfig.showArcs && showStaticConnections ? staticConnections : EMPTY_DATA}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={arcColorAccessor}
                  arcLabel={emptyArcLabelAccessor}
                  arcAltitude={arcAltitudeAccessor}
                  arcStroke={arcStrokeAccessor}
                  arcDashLength={0.25}
                  arcDashGap={0.15}
                  arcDashAnimateTime={prefersReducedMotion ? arcDashAnimateTimeStaticAccessor : arcDashAnimateTimeAccessor}
                  arcDashInitialGap={arcDashInitialGapAccessor}
                  arcCurveResolution={performanceConfig.arcCurveResolution}
                  arcCircularResolution={performanceConfig.arcCircularResolution}

                  onGlobeReady={() => {
                    setGlobeReady(true)

                    if (globeRef.current) {
                      const globeMethods = globeRef.current as unknown as GlobeInternals
                      const scene = globeMethods.scene?.()
                      if (scene) {
                        const renderer = globeMethods.renderer?.()
                        if (renderer) {
                          rendererRef.current = renderer

                          if (renderer.setPixelRatio && typeof window !== 'undefined') {
                            const ratio = effectivePerformanceMode === 'low'
                              ? 1
                              : Math.min(window.devicePixelRatio, 2)
                            renderer.setPixelRatio(ratio)
                          }

                          const originalSetAnimationLoop = renderer.setAnimationLoop.bind(renderer)
                          let lastFrameTime = 0

                          const targetFPS = effectivePerformanceMode === 'high' ? 60 :
                                          effectivePerformanceMode === 'balanced' ? 30 : 20
                          const frameInterval = 1000 / targetFPS

                          renderer.setAnimationLoop = (callback: ((time: number) => void) | null) => {
                            if (!callback) {
                              originalSetAnimationLoop(null)
                              return
                            }
                            originalSetAnimationLoop((time: number) => {
                              if (!shouldRender()) return
                              if (modalOpenRef.current) return

                              if (time - lastFrameTime >= frameInterval) {
                                lastFrameTime = time
                                callback(time)
                              }
                            })
                          }
                        }
                      }

                      // Set initial view (null checks, not truthiness — lat/lng
                      // of 0 are valid coordinates on the equator/meridian)
                      if (initialAlbumId && initialLat != null && initialLng != null) {
                        // Let the initial navigation effect handle camera positioning
                      } else if (locations.length > 0) {
                        const optimalPosition = calculateOptimalCameraPosition(locations)
                        setTimeout(() => {
                          animateCameraToPosition(optimalPosition, 2000, 'easeInOutExpo')
                        }, 1000)
                      } else {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              globeRef.current?.pointOfView({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                altitude: 3.2
                              }, 1500)
                            },
                            () => {
                              globeRef.current?.pointOfView({
                                lat: 20.5937,
                                lng: 78.9629,
                                altitude: 3.2
                              }, 1500)
                            }
                          )
                        } else {
                          globeRef.current?.pointOfView({
                            lat: 20.5937,
                            lng: 78.9629,
                            altitude: 3.2
                          }, 1500)
                        }
                      }
                    }
                  }}
                />

                <FlightAnimation
                  globe={globeRef.current as GlobeInstance | null}
                  airplaneState={currentFlightState ? {
                    isFlying: isPlaying,
                    lat: currentFlightState.position.lat,
                    lng: currentFlightState.position.lng,
                    altitude: currentFlightState.position.altitude,
                    heading: currentFlightState.rotation.heading,
                    pitch: currentFlightState.rotation.pitch,
                    bank: currentFlightState.rotation.bank,
                  } : null}
                  isActive={!showCommunityLayer && isPlaying}
                  airplaneScale={0.62}
                />

                <ArcPlanes
                  globe={globeRef.current as GlobeInstance | null}
                  arcs={!showCommunityLayer && performanceConfig.showArcs && showStaticConnections ? staticConnections : EMPTY_ARC_PLANES}
                  visible={globeReady && !isPlaying && !showCommunityLayer}
                />

                {!globeReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
                  </div>
                )}

        </div>
      </div>

      {/* Additional Help - Only in the non-embedded flow layout (in embedded
          mode it would render as a flex sibling below the globe and shrink it) */}
      {!hideHeader && showSearch && <GlobeSearchHelp />}

      {/* Album Image Modal */}
      <AlbumImageModal
        isOpen={showAlbumModal}
        onClose={() => {
          setShowAlbumModal(false)
          setSelectedCluster(null)
          setUserInteracting(false)

          if (globeRef.current && rendererRef.current) {
            globeRef.current.controls()?.update()
            setArcsKey(prev => prev + 1)

            if (!showStaticConnections && staticConnections.length > 0) {
              setShowStaticConnections(true)
            }
          }
        }}
        cluster={selectedCluster}
      />

    </div>
  )
})

EnhancedGlobe.displayName = 'EnhancedGlobe'
