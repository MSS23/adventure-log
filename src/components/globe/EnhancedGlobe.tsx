'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { FlightAnimation } from './FlightAnimation'
import { CityPinSystem, formatPinTooltip, type CityPin, type CityCluster } from './CityPinSystem'
import { AlbumImageModal } from './AlbumImageModal'
import type { GlobeInstance } from '@/types/globe'
import { GlobeSearch, type GlobeSearchResult } from './GlobeSearch'
import { LocationPreviewOverlay, type LocationPreviewData } from './LocationPreview'
import { Card, CardContent } from '@/components/ui/card'
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
  Search,
  Bug,
  Info,
  AlertTriangle,
  CheckCircle
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
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [userInteracting, setUserInteracting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [locationPreviews, setLocationPreviews] = useState<Array<{
    location: LocationPreviewData
    position: { x: number; y: number }
  }>>([])
  const [windowDimensions, setWindowDimensions] = useState({ width: 800, height: 500 })
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const cameraAnimationRef = useRef<number | null>(null)

  // Handle window resize for responsive globe
  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth * 0.9, 1200)
      const height = window.innerWidth < 640 ? Math.max(window.innerHeight * 0.6, 500) :
                    window.innerWidth < 1024 ? Math.max(window.innerHeight * 0.65, 650) :
                    window.innerWidth < 1440 ? Math.max(window.innerHeight * 0.75, 750) :
                    Math.max(window.innerHeight * 0.8, 800)
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
    setLocations
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

  // Debug information
  const debugInfo = useMemo(() => {
    const totalYears = availableYears.length
    const currentYearLocations = currentYearData?.locations.length || 0
    const totalPins = cityPins.length
    const hasLocationData = locations.some(loc => loc.latitude && loc.longitude)

    // Log debug information
    if (selectedYear) {
      log.debug('Globe Debug Info', {
        component: 'EnhancedGlobe',
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
        } : null,
        locations: locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          hasCoordinates: !!(loc.latitude && loc.longitude),
          albumCount: loc.albums.length,
          photoCount: loc.photos.length
        }))
      })
    }

    return {
      totalYears,
      currentYearLocations,
      totalPins,
      hasLocationData,
      locationsWithCoords: locations.filter(loc => loc.latitude && loc.longitude).length,
      locationsWithoutCoords: locations.filter(loc => !loc.latitude || !loc.longitude).length,
      totalAlbums: locations.reduce((sum, loc) => sum + loc.albums.length, 0),
      totalPhotos: locations.reduce((sum, loc) => sum + loc.photos.length, 0)
    }
  }, [availableYears, currentYearData, cityPins, locations, selectedYear])

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
        likes: 0,
        views: 0,
        shares: 0,
        rating: 0
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

    // Create a single-city cluster for the modal
    const singleCityCluster: CityCluster = {
      id: `single-${city.id}`,
      latitude: city.latitude,
      longitude: city.longitude,
      cities: [city],
      totalAlbums: city.albumCount,
      totalPhotos: city.photoCount,
      radius: 1
    }

    // Show album modal
    setSelectedCluster(singleCityCluster)
    setShowAlbumModal(true)

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
    setShowAlbumModal(true)
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
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <GlobeIcon className="h-8 w-8 text-blue-200" />
                Your Travel Universe
              </h1>
              <p className="text-blue-100 max-w-lg">
                Explore your adventures across the globe with interactive pins, flight paths, and beautiful memories.
              </p>
            </div>

            {/* Travel Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{cityPinSystem.clusters.length}</div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Locations</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0)}
                </div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Albums</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0)}
                </div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Photos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{availableYears.length}</div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Years</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={cn(
              "text-sm",
              showDebugPanel ? 'bg-orange-50 border-orange-300' : ''
            )}
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

              {debugInfo.locationsWithoutCoords > 0 && (
                <div className="border-t border-orange-200 pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-orange-800 font-medium text-sm">Issue Detected</div>
                      <div className="text-orange-700 text-sm">
                        {debugInfo.locationsWithoutCoords} album{debugInfo.locationsWithoutCoords === 1 ? '' : 's'}
                        {debugInfo.locationsWithoutCoords === 1 ? ' is' : ' are'} missing location coordinates (latitude/longitude).
                        These albums won&apos;t appear as pins on the globe.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedYear && debugInfo.totalPins === 0 && debugInfo.totalAlbums > 0 && (
                <div className="border-t border-orange-200 pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-red-800 font-medium text-sm">No Pins Visible</div>
                      <div className="text-red-700 text-sm">
                        You have {debugInfo.totalAlbums} album{debugInfo.totalAlbums === 1 ? '' : 's'} in {selectedYear},
                        but none have location data. Add location coordinates to your albums to see pins on the globe.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-orange-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  <Link href="/globe/location-analysis">
                    <Button variant="outline" size="sm" className="text-orange-700 border-orange-300 hover:bg-orange-100">
                      <MapPin className="h-4 w-4 mr-2" />
                      View Album Analysis
                    </Button>
                  </Link>
                  <Link href="/albums/new">
                    <Button variant="outline" size="sm" className="text-orange-700 border-orange-300 hover:bg-orange-100">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Album with Location
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </div>
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

      {/* Enhanced Year Filter */}
      {availableYears.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Travel Timeline</h3>
            <p className="text-sm text-gray-600">Select a year to explore your adventures</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {availableYears.map((year) => {
              const yearData = getYearData(year)
              const isSelected = selectedYear === year
              return (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
                  className={cn(
                    "group relative px-6 py-4 rounded-2xl transition-all duration-300 border-2 min-w-[140px]",
                    isSelected
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white shadow-lg transform scale-105"
                      : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-md hover:scale-102"
                  )}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className={cn(
                      "text-xl font-bold",
                      isSelected ? "text-white" : "text-gray-900"
                    )}>
                      {year}
                    </div>
                    {yearData && (
                      <div className={cn(
                        "text-xs space-y-0.5",
                        isSelected ? "text-blue-100" : "text-gray-500"
                      )}>
                        <div>{yearData.totalLocations} location{yearData.totalLocations === 1 ? '' : 's'}</div>
                        <div>{yearData.totalPhotos} photo{yearData.totalPhotos === 1 ? '' : 's'}</div>
                      </div>
                    )}
                  </div>

                  {/* Animated background effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl transition-opacity duration-300",
                    isSelected
                      ? "bg-gradient-to-r from-blue-400/20 to-purple-500/20 opacity-100"
                      : "bg-blue-50/0 group-hover:bg-blue-50/50 opacity-0 group-hover:opacity-100"
                  )} />
                </button>
              )
            })}
          </div>

          {/* Current Selection Summary */}
          {selectedYear && currentYearData && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  Exploring <span className="font-semibold text-gray-900">{selectedYear}</span> •
                  <span className="text-blue-600 font-medium"> {currentYearData.totalLocations} destinations</span> •
                  <span className="text-purple-600 font-medium"> {currentYearData.totalPhotos} memories</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Globe */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 xl:flex-[2]">
          <div className="globe-container bg-gradient-to-br from-blue-900 to-purple-900 h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden relative flex items-center justify-center">
            {/* Floating zoom controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={zoomIn} className="bg-white/90 hover:bg-white">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomOut} className="bg-white/90 hover:bg-white">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
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
                    const hasPhotos = data.photoCount > 0
                    const pinSize = Math.max(data.size * 32, 80)

                    el.innerHTML = `
                      <div style="
                        width: ${pinSize}px;
                        height: ${pinSize}px;
                        background: ${data.isMultiCity
                          ? `linear-gradient(135deg, ${data.color} 0%, ${data.color}aa 50%, ${data.color}ff 100%)`
                          : `radial-gradient(circle at 30% 30%, ${data.color}ff 0%, ${data.color}dd 40%, ${data.color}aa 100%)`
                        };
                        border: 3px solid ${data.isActive ? '#ffd700' : '#ffffff'};
                        border-radius: 50%;
                        opacity: ${data.opacity};
                        box-shadow:
                          0 4px 16px rgba(0,0,0,0.4),
                          0 2px 8px ${data.color}44,
                          inset 0 2px 4px rgba(255,255,255,0.3);
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        position: relative;
                        backdrop-filter: blur(1px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                      ">
                        <div style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          font-size: ${Math.max(pinSize * 0.3, 24)}px;
                          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
                          z-index: 2;
                        ">${hasPhotos ? '📸' : (data.isMultiCity ? '🏛️' : '📍')}</div>
                        ${data.isMultiCity ? `
                          <div style="
                            position: absolute;
                            top: -6px;
                            right: -6px;
                            background: linear-gradient(135deg, #ff6b35 0%, #ff4757 100%);
                            color: white;
                            border-radius: 50%;
                            width: ${Math.max(pinSize * 0.25, 20)}px;
                            height: ${Math.max(pinSize * 0.25, 20)}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${Math.max(pinSize * 0.15, 12)}px;
                            font-weight: bold;
                            border: 2px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                          ">${data.cluster.cities.length}</div>
                        ` : ''}
                      </div>
                    `
                    el.style.pointerEvents = 'auto'
                    el.addEventListener('click', () => cityPinSystem.handlePinClick(data))
                    el.addEventListener('mouseenter', () => {
                      el.style.transform = 'scale(1.6)'
                      el.style.zIndex = '1000'
                      el.style.filter = `brightness(1.2) drop-shadow(0 8px 24px ${data.color}66)`
                      const pinElement = el.querySelector('div') as HTMLElement
                      if (pinElement) {
                        pinElement.style.boxShadow = `
                          0 8px 32px rgba(0,0,0,0.5),
                          0 4px 16px ${data.color}88,
                          0 0 0 4px rgba(255,255,255,0.3),
                          inset 0 2px 4px rgba(255,255,255,0.4)
                        `
                        pinElement.style.borderWidth = '4px'
                      }
                    })
                    el.addEventListener('mouseleave', () => {
                      el.style.transform = 'scale(1)'
                      el.style.zIndex = 'auto'
                      el.style.filter = 'none'
                      const pinElement = el.querySelector('div') as HTMLElement
                      if (pinElement) {
                        pinElement.style.boxShadow = `
                          0 4px 16px rgba(0,0,0,0.4),
                          0 2px 8px ${data.color}44,
                          inset 0 2px 4px rgba(255,255,255,0.3)
                        `
                        pinElement.style.borderWidth = '3px'
                      }
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
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80">
          <Card>
            <CardContent className="p-6">
              {/* Flight Progress */}
              {isPlaying && currentSegment && (
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Current Flight</span>
                  </div>
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
                  </div>
                </div>
              )}

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

      {/* Album Image Modal */}
      <AlbumImageModal
        isOpen={showAlbumModal}
        onClose={() => {
          setShowAlbumModal(false)
          setSelectedCluster(null)
        }}
        cluster={selectedCluster}
      />
    </div>
  )
}