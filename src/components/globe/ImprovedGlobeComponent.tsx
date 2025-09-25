'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { CityPinSystem, formatPinTooltip, type CityPin, type CityCluster } from './CityPinSystem'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Globe as GlobeIcon,
  MapPin,
  Plus,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Search,
  Bug,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// Dynamically import the Globe component to avoid SSR issues with proper cleanup
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
})

interface ImprovedGlobeComponentProps {
  className?: string
}

export function ImprovedGlobeComponent({ className }: ImprovedGlobeComponentProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const isDisposed = useRef(false)
  const webglContextsRef = useRef<WebGLRenderingContext[]>([])
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Travel timeline data
  const {
    availableYears,
    getYearData,
    refreshData,
    loading: timelineLoading,
    error: timelineError
  } = useTravelTimeline()

  // Set initial year when available years are loaded
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      const currentYear = new Date().getFullYear()
      const defaultYear = availableYears.includes(currentYear)
        ? currentYear
        : availableYears[availableYears.length - 1]
      setSelectedYear(defaultYear)
    }
  }, [availableYears, selectedYear])

  // Get current year data
  const currentYearData = selectedYear ? getYearData(selectedYear) : null
  const locations = useMemo(() => currentYearData?.locations || [], [currentYearData])

  // Convert locations to city pins
  const cityPins: CityPin[] = locations.map(location => {
    const album = location.albums[0]
    const favoritePhotoUrls = album?.favoritePhotoUrls || []
    const coverPhotoUrl = album?.coverPhotoUrl

    const fallbackPhotoUrls = favoritePhotoUrls.length > 0
      ? favoritePhotoUrls
      : coverPhotoUrl
        ? [coverPhotoUrl]
        : location.photos.length > 0
          ? [location.photos[0].url]
          : []

    return {
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      albumCount: location.albums.length,
      photoCount: location.photos.length,
      visitDate: location.visitDate && !isNaN(location.visitDate.getTime())
        ? location.visitDate.toISOString()
        : new Date().toISOString(),
      isVisited: true,
      isActive: activeCityId === location.id,
      favoritePhotoUrls: fallbackPhotoUrls,
      coverPhotoUrl: coverPhotoUrl
    }
  })

  // City pin system
  const cityPinSystem = CityPinSystem({
    cities: cityPins,
    onClusterClick: (cluster) => {
      setSelectedCluster(cluster)
      setActiveCityId(cluster.cities[0]?.id || null)
      log.debug('City pin clicked', {
        component: 'ImprovedGlobeComponent',
        action: 'pin-click',
        cluster: cluster.id,
        totalCities: cluster.cities.length,
        totalAlbums: cluster.totalAlbums,
        totalPhotos: cluster.totalPhotos
      })
    },
    activeCity: activeCityId
  })

  // Debug information
  const debugInfo = useMemo(() => {
    const totalYears = availableYears.length
    const currentYearLocations = currentYearData?.locations.length || 0
    const totalPins = cityPins.length
    const hasLocationData = locations.some(loc => loc.latitude && loc.longitude)

    // Log debug information
    if (selectedYear) {
      log.debug('Globe Debug Info', {
        component: 'ImprovedGlobeComponent',
        selectedYear,
        totalYears,
        currentYearLocations,
        totalPins,
        hasLocationData,
        availableYears,
        currentYearData: currentYearData ? {
          year: currentYearData.year,
          totalLocations: currentYearData.totalLocations,
          totalPhotos: currentYearData.totalPhotos,
          countries: currentYearData.countries
        } : null
      })
    }

    return {
      totalYears,
      currentYearLocations,
      totalPins,
      totalAlbums: currentYearData?.totalLocations || 0,
      totalPhotos: currentYearData?.totalPhotos || 0,
      locationsWithCoords: locations.filter(loc => loc.latitude && loc.longitude).length,
      locationsWithoutCoords: locations.filter(loc => !loc.latitude || !loc.longitude).length,
      hasLocationData
    }
  }, [availableYears, currentYearData, cityPins, locations, selectedYear])

  // Comprehensive WebGL cleanup function
  const cleanupWebGL = useCallback(() => {
    if (isDisposed.current) return

    try {
      isDisposed.current = true

      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }

      // Simple, TypeScript-friendly WebGL cleanup
      if (globeRef.current) {
        // Clear the globe reference
        globeRef.current = undefined
      }

      // Clear WebGL context tracking
      webglContextsRef.current = []

      log.info('WebGL cleanup completed successfully', {
        component: 'ImprovedGlobeComponent',
        action: 'cleanup-complete'
      })

    } catch (error) {
      log.error('Error during WebGL cleanup', {
        component: 'ImprovedGlobeComponent',
        action: 'cleanup-error'
      }, error)
    }
  }, [])

  // Component cleanup effect
  useEffect(() => {
    isDisposed.current = false

    return () => {
      cleanupWebGL()
    }
  }, [cleanupWebGL])

  // Page visibility cleanup
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        log.debug('Page hidden, pausing globe animations', {
          component: 'ImprovedGlobeComponent',
          action: 'visibility-change'
        })
        if (globeRef.current) {
          const globe = globeRef.current as unknown as Record<string, unknown>
          if (typeof globe.pauseAnimation === 'function') {
            globe.pauseAnimation()
          }
        }
      } else {
        log.debug('Page visible, resuming globe animations', {
          component: 'ImprovedGlobeComponent',
          action: 'visibility-change'
        })
        if (globeRef.current) {
          const globe = globeRef.current as unknown as Record<string, unknown>
          if (typeof globe.resumeAnimation === 'function') {
            globe.resumeAnimation()
          }
        }
      }
    }

    const handleBeforeUnload = () => {
      cleanupWebGL()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cleanupWebGL])

  // Window dimensions for responsive globe
  const [windowDimensions, setWindowDimensions] = useState({
    width: 800,
    height: 600
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setWindowDimensions({
          width: rect.width || 800,
          height: rect.height || 600
        })
      }
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Camera animation helper with proper cleanup
  const animateCameraToPosition = useCallback((
    target: { lat: number; lng: number; altitude: number },
    duration = 2000,
    easing = 'easeInOutCubic'
  ) => {
    if (!globeRef.current || isDisposed.current) return

    const startTime = performance.now()
    const currentPOV = globeRef.current.pointOfView()

    const animate = () => {
      if (isDisposed.current) return

      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function
      let easedProgress = progress
      if (easing === 'easeInOutCubic') {
        easedProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2
      }

      const interpolatedPOV = {
        lat: currentPOV.lat + (target.lat - currentPOV.lat) * easedProgress,
        lng: currentPOV.lng + (target.lng - currentPOV.lng) * easedProgress,
        altitude: currentPOV.altitude + (target.altitude - currentPOV.altitude) * easedProgress
      }

      if (globeRef.current && !isDisposed.current) {
        globeRef.current.pointOfView(interpolatedPOV, 0)
      }

      if (progress < 1 && !isDisposed.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()
  }, [])

  // Event handlers
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year)
    setActiveCityId(null)
    setSelectedCluster(null)
    log.info('Year filter changed', {
      component: 'ImprovedGlobeComponent',
      action: 'year-change',
      selectedYear: year
    })
  }, [])

  const zoomIn = useCallback(() => {
    if (!globeRef.current || isDisposed.current) return
    const currentPOV = globeRef.current.pointOfView()
    const newAltitude = Math.max(0.5, currentPOV.altitude * 0.8)
    animateCameraToPosition({
      lat: currentPOV.lat,
      lng: currentPOV.lng,
      altitude: newAltitude
    }, 500, 'easeInOutCubic')
  }, [animateCameraToPosition])

  const zoomOut = useCallback(() => {
    if (!globeRef.current || isDisposed.current) return
    const currentPOV = globeRef.current.pointOfView()
    const newAltitude = Math.min(4, currentPOV.altitude * 1.2)
    animateCameraToPosition({
      lat: currentPOV.lat,
      lng: currentPOV.lng,
      altitude: newAltitude
    }, 500, 'easeInOutCubic')
  }, [animateCameraToPosition])

  const handleGlobeReady = useCallback(() => {
    if (isDisposed.current) return

    setGlobeReady(true)
    log.info('Globe ready, initializing camera position', {
      component: 'ImprovedGlobeComponent',
      action: 'globe-ready',
      locationCount: locations.length
    })

    // Set initial optimal view if locations exist
    if (locations.length > 0) {
      const calculateOptimalPosition = (locations: TravelLocation[]) => {
        if (locations.length === 0) return { lat: 0, lng: 0, altitude: 2.5 }
        if (locations.length === 1) {
          return {
            lat: locations[0].latitude,
            lng: locations[0].longitude,
            altitude: 1.8
          }
        }

        const lats = locations.map(loc => loc.latitude)
        const lngs = locations.map(loc => loc.longitude)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)

        const centerLat = (minLat + maxLat) / 2
        const centerLng = (minLng + maxLng) / 2

        const latSpan = maxLat - minLat
        const lngSpan = maxLng - minLng
        const maxSpan = Math.max(latSpan, lngSpan)
        const altitude = Math.max(1.5, Math.min(4, maxSpan * 0.02 + 1.2))

        return { lat: centerLat, lng: centerLng, altitude }
      }

      const optimalPosition = calculateOptimalPosition(locations)
      setTimeout(() => {
        if (!isDisposed.current) {
          animateCameraToPosition(optimalPosition, 2000, 'easeInOutCubic')
        }
      }, 1000)
    }
  }, [locations, animateCameraToPosition])

  // Only render if not disposed and client-side
  if (isDisposed.current || typeof window === 'undefined') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GlobeIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Travel Globe</h1>
          {timelineLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={showSearch ? "bg-blue-50 border-blue-300" : ""}
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={showDebugPanel ? "bg-orange-50 border-orange-300" : ""}
          >
            <Bug className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Debug</span>
          </Button>
          <Link href="/albums/new">
            <Button size="sm" className="text-sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Adventure</span>
            </Button>
          </Link>
        </div>
      </div>

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

      {/* Debug Panel */}
      {showDebugPanel && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium text-orange-800">Globe Debug Information</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-orange-700 font-medium">Available Years</div>
                  <div className="text-orange-600">{debugInfo.totalYears}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-orange-700 font-medium">Current Year Locations</div>
                  <div className="text-orange-600">{debugInfo.currentYearLocations}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-orange-700 font-medium">Total Albums</div>
                  <div className="text-orange-600">{debugInfo.totalAlbums}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-orange-700 font-medium">Total Photos</div>
                  <div className="text-orange-600">{debugInfo.totalPhotos}</div>
                </div>
              </div>

              <div className="border-t border-orange-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {debugInfo.totalPins > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-orange-700 font-medium">Pins on Globe</span>
                    </div>
                    <div className="text-orange-600 ml-6">{debugInfo.totalPins} pins visible</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {debugInfo.locationsWithCoords > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-orange-700 font-medium">With Coordinates</span>
                    </div>
                    <div className="text-orange-600 ml-6">{debugInfo.locationsWithCoords} locations</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {debugInfo.locationsWithoutCoords === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="text-orange-700 font-medium">Missing Coordinates</span>
                    </div>
                    <div className="text-orange-600 ml-6">{debugInfo.locationsWithoutCoords} locations</div>
                  </div>
                </div>
              </div>

              {/* WebGL Context Information */}
              <div className="border-t border-orange-200 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-700 font-medium text-sm">WebGL Status</span>
                </div>
                <div className="text-orange-600 text-sm">
                  Globe Ready: {globeReady ? '✅' : '❌'} |
                  Disposed: {isDisposed.current ? '✅' : '❌'} |
                  Canvas Elements: {document.querySelectorAll('canvas').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year Filter */}
      {availableYears.length > 0 && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800">Travel Year:</span>
            <div className="flex gap-2">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleYearChange(year)}
                  className={selectedYear === year
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "hover:bg-blue-50 hover:border-blue-300"
                  }
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Globe Container */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 xl:flex-[2]">
          <div
            ref={containerRef}
            className="globe-container bg-gradient-to-br from-blue-900 to-purple-900 h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden relative flex items-center justify-center"
          >
            {/* Floating zoom controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={zoomIn} className="bg-white/90 hover:bg-white">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomOut} className="bg-white/90 hover:bg-white">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Globe Component with WebGL Management */}
            <Globe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              backgroundColor="#0f1729"
              width={windowDimensions.width}
              height={windowDimensions.height}
              showAtmosphere={true}
              atmosphereColor="rgba(135, 206, 250, 0.8)"
              atmosphereAltitude={0.25}

              // Smooth controls
              enablePointerInteraction={true}

              // City pins
              htmlElementsData={cityPinSystem.pinData}
              htmlLat={(d: object) => (d as { lat: number }).lat}
              htmlLng={(d: object) => (d as { lng: number }).lng}
              htmlAltitude={(d: object) => (d as { size: number }).size * 0.01}
              htmlElement={(d: object) => {
                const data = d as {
                  lat: number;
                  lng: number;
                  size: number;
                  color: string;
                  opacity: number;
                  cluster: CityCluster;
                  isMultiCity: boolean;
                  isActive: boolean;
                  label: string;
                  albumCount: number;
                  photoCount: number;
                }

                const el = document.createElement('div')
                el.innerHTML = `
                  <div style="
                    width: ${data.size * 8}px;
                    height: ${data.size * 8}px;
                    background: ${data.color};
                    border: 2px solid white;
                    border-radius: 50%;
                    opacity: ${data.opacity};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                  "></div>
                `
                el.style.pointerEvents = 'auto'
                el.addEventListener('click', () => cityPinSystem.handlePinClick(data))
                el.addEventListener('mouseenter', () => {
                  el.style.transform = 'scale(1.2)'
                })
                el.addEventListener('mouseleave', () => {
                  el.style.transform = 'scale(1)'
                })

                // Add tooltip
                el.title = formatPinTooltip(data.cluster)

                return el
              }}

              onGlobeReady={handleGlobeReady}
            />

            {!globeReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80">
          <Card>
            <CardContent className="p-6">
              {/* Location Details */}
              {selectedCluster && (
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedCluster.cities.length > 1
                        ? `${selectedCluster.cities.length} Cities`
                        : selectedCluster.cities[0]?.name
                      }
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        {selectedCluster.totalAlbums}
                      </div>
                      <div className="text-xs text-gray-800">Albums</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        {selectedCluster.totalPhotos}
                      </div>
                      <div className="text-xs text-gray-800">Photos</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 mb-3">Quick Actions</div>
                <Link href="/albums/new">
                  <Button className="w-full justify-start text-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Adventure
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => setActiveCityId(null)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={refreshData}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}