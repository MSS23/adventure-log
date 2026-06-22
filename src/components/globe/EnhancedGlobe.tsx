'use client'

import { useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeInstance } from '@/types/globe'
import { CityPinSystem, type CityCluster } from './CityPinSystem'
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

export interface WishlistPin {
  id: string
  latitude: number
  longitude: number
  location_name: string
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
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
  getAvailableYears: () => number[]
  getCanvas: () => HTMLCanvasElement | null
  flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => Promise<void>
}

export const EnhancedGlobe = forwardRef<EnhancedGlobeRef, EnhancedGlobeProps>(
  function EnhancedGlobe({ className, initialAlbumId, initialLat, initialLng, filterUserId, hideHeader = false, selectedYear: selectedYearProp, onYearChange: onYearChangeProp, onGlobeBackgroundClick, wishlistPins, onWishlistPinClick }, ref) {

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
    showAlbumModal, setShowAlbumModal, setActiveCityId,
    isAutoRotating, setIsAutoRotating,
    userInteracting, setUserInteracting,
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
    isPlaying, currentFlightState, destinationCameraPosition,
    handleYearChange, handleSearchResult,
    handleCityClick, handleClusterClick, handleLocationToggle,
    searchData, travelStats, getYearColor, cityPins, staticConnections,
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

  // Zoom-aware clustering: track the camera altitude so the cluster radius
  // recomputes as the user zooms. Bucketed + throttled so we only rebuild the
  // (expensive) HTML pin elements when the altitude actually crosses a band,
  // not on every frame of an inertial zoom.
  const [cameraAltitude, setCameraAltitude] = useState<number>(2.5)
  const lastZoomTickRef = useRef<number>(0)

  const handleZoom = useCallback((pov: { lat: number; lng: number; altitude: number }) => {
    const altitude = pov?.altitude
    if (!Number.isFinite(altitude)) return

    // Throttle to ~120ms so smooth/inertial zooms don't thrash React.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    if (now - lastZoomTickRef.current < 120) return
    lastZoomTickRef.current = now

    setCameraAltitude(prev => {
      // Only update state when the change is meaningful enough to possibly
      // cross a clustering band — avoids re-render churn from tiny deltas.
      if (Math.abs(prev - altitude) < 0.02) return prev
      return altitude
    })
  }, [])

  // Get city pin system data (recomputed when the zoom band changes)
  const cityPinSystem = CityPinSystem({
    cities: cityPins,
    onCityClick: handleCityClick,
    onClusterClick: handleClusterClick,
    activeCity: state.activeCityId,
    altitude: cameraAltitude
  })

  // Combine city pins with current location pin and any wishlist pins
  const allPinData = useMemo(() => {
    const pins = [...cityPinSystem.pinData] as Array<{
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
      label: string;
      albumCount: number;
      photoCount: number;
      accuracy?: number;
    }>

    if (currentLocation && showCurrentLocation) {
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
    if (wishlistPins && wishlistPins.length > 0) {
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

    return pins
  }, [cityPinSystem.pinData, currentLocation, showCurrentLocation, wishlistPins])

  // Set navigation handler for imperative handle
  navigationHandlerRef.current = (albumId: string, lat: number, lng: number) => {
    const city = cityPins.find(pin => pin.id === albumId)

    if (city && globeReady) {
      handleCityClick(city)
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
        />

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

      {/* Search Bar - Only show when not embedded */}
      {!hideHeader && showSearch && (
        <div className="flex justify-center">
          <GlobeSearch
            data={searchData}
            onResultClick={handleSearchResult}
            onClearSearch={() => setShowSearch(false)}
            className="w-full max-w-md"
          />
        </div>
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
                  htmlLat={(d: object) => (d as { lat: number }).lat}
                  htmlLng={(d: object) => (d as { lng: number }).lng}
                  htmlAltitude={(d: object) => (d as { size: number }).size * 0.01}
                  htmlElement={(d: object) => createPinElement(d, {
                    locations,
                    getYearColor,
                    cityPins,
                    cityPinSystem,
                    handleCityClick,
                    onWishlistPinClick
                  })}

                  // Animation rings disabled for performance
                  ringsData={[]}
                  ringLat={(d: object) => (d as { lat: number }).lat}
                  ringLng={(d: object) => (d as { lng: number }).lng}
                  ringMaxRadius={0}
                  ringPropagationSpeed={0}
                  ringRepeatPeriod={0}
                  ringColor={() => 'transparent'}

                  // Animated travel arcs with moving dash
                  arcsData={performanceConfig.showArcs && showStaticConnections ? staticConnections : []}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={(d: object) => {
                    const path = d as FlightPath
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
                  }}
                  arcAltitude={(d: object) => {
                    const path = d as FlightPath
                    const minAlt = 0.08
                    const distFactor = Math.min(path.distance / 90, 1)
                    return minAlt + distFactor * 0.45
                  }}
                  arcStroke={(d: object) => {
                    const path = d as FlightPath
                    const recency = path.total > 1 ? (path.index / (path.total - 1)) : 1
                    return performanceConfig.arcStroke * (0.7 + recency * 0.5)
                  }}
                  arcDashLength={0.25}
                  arcDashGap={0.15}
                  arcDashAnimateTime={(d: object) => {
                    const path = d as FlightPath
                    const speedFactor = Math.min(path.distance / 60, 1)
                    return 3000 + speedFactor * 3000
                  }}
                  arcDashInitialGap={(d: object) => {
                    const path = d as FlightPath
                    return (path.index * 0.37) % 1
                  }}
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

                      // Set initial view
                      if (initialAlbumId && initialLat && initialLng) {
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
                    fromLat: currentFlightState.position.lat,
                    fromLng: currentFlightState.position.lng,
                    toLat: destinationCameraPosition?.lat || currentFlightState.position.lat,
                    toLng: destinationCameraPosition?.lng || currentFlightState.position.lng,
                    progress: currentFlightState.progress,
                    altitude: currentFlightState.position.altitude
                  } : null}
                  isActive={isPlaying}
                  trailColor="#00ff88"
                  airplaneScale={0.005}
                />

                <ArcPlanes
                  globe={globeRef.current as GlobeInstance | null}
                  arcs={performanceConfig.showArcs && showStaticConnections ? staticConnections : []}
                  visible={globeReady && !isPlaying}
                />

                {!globeReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
                  </div>
                )}

        </div>
      </div>

      {/* Additional Help */}
      {showSearch && <GlobeSearchHelp />}

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
