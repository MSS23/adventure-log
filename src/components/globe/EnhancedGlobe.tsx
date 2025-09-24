'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { TimelineControls } from './TimelineControls'
import { FlightAnimation } from './FlightAnimation'
import { CityPinSystem, formatPinTooltip, type CityPin, type CityCluster } from './CityPinSystem'
import type { GlobeInstance } from '@/types/globe'
import { GlobeSearch, type GlobeSearchResult } from './GlobeSearch'
import { LocationPreviewOverlay, type LocationPreviewData } from './LocationPreview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe as GlobeIcon,
  MapPin,
  Plus,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Plane,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface EnhancedGlobeProps {
  className?: string
}

export function EnhancedGlobe({ className }: EnhancedGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [userInteracting, setUserInteracting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [locationPreviews, setLocationPreviews] = useState<Array<{
    location: LocationPreviewData
    position: { x: number; y: number }
  }>>([])
  const [windowDimensions, setWindowDimensions] = useState({ width: 800, height: 500 })
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const cameraAnimationRef = useRef<number | null>(null)

  // Handle window resize for responsive globe
  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth * 0.85, 1000)
      const height = window.innerWidth < 640 ? 400 :
                    window.innerWidth < 1024 ? 500 : 600
      setWindowDimensions({ width, height })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])


  // Travel timeline hook
  const {
    availableYears,
    loading: timelineLoading,
    error: timelineError,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData
  } = useTravelTimeline()

  // Flight animation hook
  const {
    isPlaying,
    currentFlightState,
    progress,
    cameraPosition,
    play,
    pause,
    reset,
    setSpeed,
    setLocations,
    seekToSegment,
    speed,
    totalDuration
  } = useFlightAnimation({
    autoPlay: false,
    defaultSpeed: 1,
    cameraFollowsPlane: true,
    onSegmentComplete: (location) => {
      setActiveCityId(location.id)
      log.debug('Flight animation segment completed', {
        component: 'EnhancedGlobe',
        action: 'segment-complete',
        locationId: location.id,
        locationName: location.name
      })
    },
    onAnimationComplete: () => {
      log.info('Flight animation completed successfully', {
        component: 'EnhancedGlobe',
        action: 'animation-complete'
      })
    },
    onError: (error) => {
      log.error('Flight animation failed', {
        component: 'EnhancedGlobe',
        action: 'animation-error'
      }, error)
    }
  })

  // Get current year data
  const currentYearData = selectedYear ? getYearData(selectedYear) : null
  const locations = useMemo(() => currentYearData?.locations || [], [currentYearData])

  // Prepare search data
  const searchData: GlobeSearchResult[] = useMemo(() => {
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      country: 'Unknown Location',
      visitDate: location.visitDate.toISOString(),
      albumCount: location.albums.length,
      photoCount: location.photos.length,
      coverPhotoUrl: location.albums[0]?.coverPhotoUrl,
      tags: [],
      type: 'location' as const
    }))
  }, [locations])

  // Convert locations to city pins
  const cityPins: CityPin[] = locations.map(location => {
    // Get favorite photos from the first album (since each location represents one album)
    const album = location.albums[0]
    const favoritePhotoUrls = album?.favoritePhotoUrls || []
    const coverPhotoUrl = album?.coverPhotoUrl

    // Fallback: if no favorites selected, use cover photo or first photo
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
      visitDate: location.visitDate.toISOString(),
      isVisited: true,
      isActive: activeCityId === location.id,
      favoritePhotoUrls: fallbackPhotoUrls,
      coverPhotoUrl: coverPhotoUrl
    }
  })

  // Get city pin system data
  const cityPinSystem = CityPinSystem({
    cities: cityPins,
    onCityClick: handleCityClick,
    onClusterClick: handleClusterClick,
    activeCity: activeCityId
  })

  // Update flight animation when locations change
  useEffect(() => {
    if (locations.length > 1) {
      setLocations(locations)
    }
  }, [locations, setLocations])

  // Update camera position from flight animation with smooth easing
  useEffect(() => {
    if (cameraPosition && globeRef.current) {
      animateCameraToPosition(cameraPosition, 1500, 'easeInOutCubic')
    }
  }, [cameraPosition])

  // Auto-rotation functionality
  useEffect(() => {
    if (!globeRef.current || !isAutoRotating || userInteracting || isPlaying) {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current)
      }
      return
    }

    autoRotateRef.current = setInterval(() => {
      if (globeRef.current && !userInteracting) {
        const pov = globeRef.current.pointOfView()
        globeRef.current.pointOfView({
          ...pov,
          lng: (pov.lng + 0.3) % 360
        }, 0)
      }
    }, 50)

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current)
      }
    }
  }, [isAutoRotating, userInteracting, isPlaying])

  // Enhanced camera animation function
  const animateCameraToPosition = useCallback((targetPOV: { lat: number; lng: number; altitude: number }, duration: number = 1000, easing: string = 'easeInOutQuad') => {
    if (!globeRef.current) return

    if (cameraAnimationRef.current) {
      cancelAnimationFrame(cameraAnimationRef.current)
    }

    const startPOV = globeRef.current.pointOfView()
    const startTime = Date.now()

    const easingFunctions = {
      linear: (t: number) => t,
      easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      easeInOutExpo: (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2
    }

    const easeFn = easingFunctions[easing as keyof typeof easingFunctions] || easingFunctions.easeInOutQuad

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeFn(progress)

      // Interpolate position with proper longitude wrapping
      const interpolatedPOV = {
        lat: startPOV.lat + (targetPOV.lat - startPOV.lat) * easedProgress,
        lng: interpolateLongitude(startPOV.lng, targetPOV.lng, easedProgress),
        altitude: startPOV.altitude + (targetPOV.altitude - startPOV.altitude) * easedProgress
      }

      if (globeRef.current) {
        globeRef.current.pointOfView(interpolatedPOV, 0)
      }

      if (progress < 1) {
        cameraAnimationRef.current = requestAnimationFrame(animate)
      }
    }

    animate()
  }, [])

  // Helper function to properly interpolate longitude (handling 180/-180 boundary)
  const interpolateLongitude = useCallback((start: number, end: number, progress: number) => {
    const diff = end - start
    const wrappedDiff = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff
    return start + wrappedDiff * progress
  }, [])

  // Calculate optimal camera position for locations
  const calculateOptimalCameraPosition = useCallback((locations: TravelLocation[]) => {
    if (locations.length === 0) return { lat: 0, lng: 0, altitude: 2.5 }
    if (locations.length === 1) {
      return {
        lat: locations[0].latitude,
        lng: locations[0].longitude,
        altitude: 1.8
      }
    }

    // Calculate bounds
    const lats = locations.map(loc => loc.latitude)
    const lngs = locations.map(loc => loc.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Calculate center
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Calculate altitude based on span
    const latSpan = maxLat - minLat
    const lngSpan = maxLng - minLng
    const maxSpan = Math.max(latSpan, lngSpan)
    const altitude = Math.max(1.5, Math.min(4, maxSpan * 0.02 + 1.2))

    return { lat: centerLat, lng: centerLng, altitude }
  }, [])

  // Search and preview functions
  const handleSearchResult = useCallback((result: GlobeSearchResult) => {
    const location = locations.find(loc => loc.id === result.id)
    if (location) {
      setActiveCityId(result.id)
      setIsAutoRotating(false)
      animateCameraToPosition({
        lat: result.latitude,
        lng: result.longitude,
        altitude: 1.5
      }, 1500, 'easeInOutCubic')

      // Show preview after camera movement
      setTimeout(() => {
        showLocationPreview(location, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
      }, 800)
    }
  }, [locations, animateCameraToPosition])

  const showLocationPreview = useCallback((location: TravelLocation, position: { x: number; y: number }) => {
    const previewData: LocationPreviewData = {
      id: location.id,
      name: location.name,
      country: 'Unknown Location',
      latitude: location.latitude,
      longitude: location.longitude,
      visitDate: location.visitDate.toISOString(),
      albumCount: location.albums.length,
      photoCount: location.photos.length,
      favoritePhotoUrls: location.albums[0]?.favoritePhotoUrls || [],
      coverPhotoUrl: location.albums[0]?.coverPhotoUrl,
      description: `Travel memories from ${location.name}`,
      tags: [],
      isPublic: true,
      isFavorite: false,
      stats: {
        likes: Math.floor(Math.random() * 100), // Mock data
        views: Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 20),
        rating: 4 + Math.random()
      }
    }

    setLocationPreviews(prev => {
      const existing = prev.find(p => p.location.id === location.id)
      if (existing) return prev
      return [...prev, { location: previewData, position }]
    })
  }, [])

  const closeLocationPreview = useCallback((locationId: string) => {
    setLocationPreviews(prev => prev.filter(p => p.location.id !== locationId))
  }, [])

  const handleLocationFavorite = useCallback((locationId: string) => {
    // Basic favorites functionality - in a real app, this would update the backend
    setLocationPreviews(prev =>
      prev.map(preview => {
        if (preview.location.id === locationId) {
          return {
            ...preview,
            location: {
              ...preview.location,
              isFavorite: !preview.location.isFavorite
            }
          }
        }
        return preview
      })
    )
    log.info('Toggled favorite for location', {
      component: 'EnhancedGlobe',
      action: 'toggle-favorite',
      locationId
    })
  }, [])


  function handleCityClick(city: CityPin) {
    setActiveCityId(city.id)
    setIsAutoRotating(false)

    // Show location preview
    const location = locations.find(loc => loc.id === city.id)
    if (location) {
      showLocationPreview(location, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }

    if (globeRef.current) {
      animateCameraToPosition({
        lat: city.latitude,
        lng: city.longitude,
        altitude: 1.5
      }, 1200, 'easeInOutCubic')
    }
    // Resume auto-rotation after 5 seconds of no interaction
    setTimeout(() => setIsAutoRotating(true), 5000)
  }

  function handleClusterClick(cluster: CityCluster) {
    setSelectedCluster(cluster)
    setIsAutoRotating(false)
    if (globeRef.current) {
      animateCameraToPosition({
        lat: cluster.latitude,
        lng: cluster.longitude,
        altitude: 1.2
      }, 1200, 'easeInOutCubic')
    }
    // Resume auto-rotation after 5 seconds of no interaction
    setTimeout(() => setIsAutoRotating(true), 5000)
  }

  function handleYearChange(year: number) {
    setSelectedYear(year)
    setActiveCityId(null)
    setSelectedCluster(null)
    reset()

    // Smooth transition to optimal view for new year's locations
    setTimeout(() => {
      const yearData = getYearData(year)
      if (yearData && yearData.locations.length > 0) {
        const optimalPosition = calculateOptimalCameraPosition(yearData.locations)
        animateCameraToPosition(optimalPosition, 2000, 'easeInOutExpo')
      }
    }, 500)
  }

  function handlePlayPause() {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  function handleReset() {
    reset()
    setActiveCityId(null)
    setSelectedCluster(null)
    setIsAutoRotating(true)
    if (globeRef.current) {
      animateCameraToPosition({ lat: 0, lng: 0, altitude: 2.5 }, 1500, 'easeInOutExpo')
    }
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed)
  }

  function handleSeek(segment: number) {
    seekToSegment(segment)
    if (locations[segment]) {
      setActiveCityId(locations[segment].id)
    }
  }

  function zoomIn() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.max(0.5, pov.altitude * 0.8)
      animateCameraToPosition({ ...pov, altitude: newAltitude }, 400, 'easeInOutQuad')
      setIsAutoRotating(false)
      setTimeout(() => setIsAutoRotating(true), 3000)
    }
  }

  function zoomOut() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.min(5, pov.altitude * 1.2)
      animateCameraToPosition({ ...pov, altitude: newAltitude }, 400, 'easeInOutQuad')
      setIsAutoRotating(false)
      setTimeout(() => setIsAutoRotating(true), 3000)
    }
  }

  // Get current segment for timeline controls
  const currentSegment = locations[progress.currentSegment] ? {
    id: locations[progress.currentSegment].id,
    year: locations[progress.currentSegment].visitDate.getFullYear(),
    sequenceOrder: progress.currentSegment + 1,
    cityId: undefined,
    countryId: undefined,
    visitDate: locations[progress.currentSegment].visitDate.toISOString().split('T')[0],
    latitude: locations[progress.currentSegment].latitude,
    longitude: locations[progress.currentSegment].longitude,
    albumCount: locations[progress.currentSegment].albums.length,
    photoCount: locations[progress.currentSegment].photos.length,
    locationName: locations[progress.currentSegment].name
  } : null

  const timelineEntries = locations.map((location, index) => ({
    id: location.id,
    year: location.visitDate.getFullYear(),
    sequenceOrder: index + 1,
    cityId: undefined,
    countryId: undefined,
    visitDate: location.visitDate.toISOString().split('T')[0],
    latitude: location.latitude,
    longitude: location.longitude,
    albumCount: location.albums.length,
    photoCount: location.photos.length,
    locationName: location.name
  }))

  if (timelineLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <h2 className="text-xl font-semibold mt-4">Loading your travel timeline...</h2>
          <p className="text-gray-800 mt-2">Preparing flight animation data</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <GlobeIcon className="h-8 w-8 lg:h-10 lg:w-10 text-blue-600" />
            Adventure Globe
          </h1>
          <p className="text-gray-800 mt-3 text-base sm:text-lg max-w-2xl">
            Watch your travels unfold with cinematic flight animations and explore your journey through time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "text-sm",
              showSearch ? 'bg-blue-50 border-blue-300' : ''
            )}
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={locations.length < 2}
            className="text-sm"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 sm:mr-2" />
            ) : (
              <Play className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">
              {isPlaying ? 'Pause' : 'Play'} Flight
            </span>
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

      {/* Search Bar */}
      {showSearch && (
        <div className="flex justify-center">
          <GlobeSearch
            data={searchData}
            onResultClick={handleSearchResult}
            onClearSearch={() => setShowSearch(false)}
            className="w-full max-w-md"
          />
        </div>
      )}

      {/* Stats */}
      {currentYearData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-bold text-blue-600">
                  {currentYearData.totalLocations}
                </div>
                <div className="text-sm text-gray-800 mt-1">Destinations</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-bold text-green-600">
                  {currentYearData.totalPhotos}
                </div>
                <div className="text-sm text-gray-800 mt-1">Photos</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-bold text-purple-600">
                  {currentYearData.countries.length}
                </div>
                <div className="text-sm text-gray-800 mt-1">Countries</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-bold text-orange-600">
                  {Math.round(currentYearData.totalDistance || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-800 mt-1">KM Traveled</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Globe */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 xl:flex-[2]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-600" />
                  Interactive Flight Globe
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                {selectedYear
                  ? `Flight animation for ${selectedYear} • ${locations.length} destinations`
                  : 'Select a year to begin your journey'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="globe-container bg-gradient-to-br from-blue-900 to-purple-900 h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden relative flex items-center justify-center">
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundColor="#0f1729"
                  width={windowDimensions.width}
                  height={windowDimensions.height}
                  showAtmosphere={true}
                  atmosphereColor="rgba(135, 206, 250, 0.8)"
                  atmosphereAltitude={0.25}

                  // Enhanced interaction handling
                  onGlobeClick={() => {
                    setUserInteracting(true)
                    setIsAutoRotating(false)
                    setTimeout(() => {
                      setUserInteracting(false)
                      setIsAutoRotating(true)
                    }, 3000)
                  }}

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

                  // Labels
                  labelsData={cityPinSystem.labelData}
                  labelLat={(d: object) => (d as { lat: number }).lat}
                  labelLng={(d: object) => (d as { lng: number }).lng}
                  labelText={(d: object) => (d as { text: string }).text}
                  labelSize={(d: object) => (d as { size: number }).size}
                  labelColor={(d: object) => (d as { color: string }).color}
                  labelDotRadius={0.5}
                  labelIncludeDot={true}

                  // Animation rings for active cities
                  ringsData={cityPinSystem.ringData}
                  ringLat={(d: object) => (d as { lat: number }).lat}
                  ringLng={(d: object) => (d as { lng: number }).lng}
                  ringMaxRadius={(d: object) => (d as { maxR: number }).maxR}
                  ringPropagationSpeed={(d: object) => (d as { propagationSpeed: number }).propagationSpeed}
                  ringRepeatPeriod={(d: object) => (d as { repeatPeriod: number }).repeatPeriod}
                  ringColor={(d: object) => (d as { color: string }).color}

                  onGlobeReady={() => {
                    setGlobeReady(true)
                    // Set initial optimal view if locations exist
                    if (locations.length > 0) {
                      const optimalPosition = calculateOptimalCameraPosition(locations)
                      setTimeout(() => {
                        animateCameraToPosition(optimalPosition, 2000, 'easeInOutExpo')
                      }, 1000)
                    }
                  }}
                />

                <FlightAnimation
                  globe={globeRef.current as GlobeInstance | null}
                  airplaneState={currentFlightState}
                  isActive={isPlaying}
                  trailColor="#00ff88"
                  airplaneScale={0.005}
                />

                {!globeReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80 space-y-6">
          {/* Current Flight Info */}
          {isPlaying && currentSegment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-600" />
                  Current Flight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{currentSegment.locationName}</p>
                    <p className="text-sm text-gray-800">
                      Segment {progress.currentSegment + 1} of {progress.totalSegments}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {Math.round(progress.overallProgress)}% Complete
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                      {Math.round(progress.estimatedTimeRemaining)}s remaining
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {selectedCluster.cities.length > 1
                    ? `${selectedCluster.cities.length} Cities`
                    : selectedCluster.cities[0]?.name
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedCluster.totalAlbums}
                      </div>
                      <div className="text-sm text-gray-800">Albums</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedCluster.totalPhotos}
                      </div>
                      <div className="text-sm text-gray-800">Photos</div>
                    </div>
                  </div>

                  {selectedCluster.cities.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Cities in Cluster</h4>
                      {selectedCluster.cities.map((city) => (
                        <div key={city.id} className="p-2 border rounded text-sm">
                          <div className="font-medium">{city.name}</div>
                          <div className="text-gray-800">
                            {city.albumCount} albums • {city.photoCount} photos
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/albums/new">
                  <Button className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Adventure
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveCityId(null)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
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

      {/* Timeline Controls */}
      {availableYears.length > 0 && (
        <TimelineControls
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          isPlaying={isPlaying}
          onPlay={handlePlayPause}
          onPause={handlePlayPause}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          progress={{
            segment: progress.currentSegment,
            total: progress.totalSegments,
            percentage: progress.overallProgress
          }}
          onSeek={handleSeek}
          currentSegment={currentSegment}
          timeline={timelineEntries}
          totalDuration={totalDuration}
        />
      )}

      {/* Location Previews */}
      <LocationPreviewOverlay
        previews={locationPreviews}
        onClose={closeLocationPreview}
        onNavigate={(lat, lng) => {
          animateCameraToPosition({ lat, lng, altitude: 1.5 }, 1000, 'easeInOutCubic')
        }}
        onFavorite={handleLocationFavorite}
      />

      {/* Keyboard Shortcuts Help */}
      {showSearch && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="bg-black/80 text-white text-sm p-2">
            <div className="space-y-1">
              <div><kbd className="bg-white/20 px-1 rounded">⌃K</kbd> Search</div>
              <div><kbd className="bg-white/20 px-1 rounded">↑↓</kbd> Navigate</div>
              <div><kbd className="bg-white/20 px-1 rounded">⏎</kbd> Select</div>
              <div><kbd className="bg-white/20 px-1 rounded">Esc</kbd> Close</div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Onboarding for New Users */}
    </div>
  )
}