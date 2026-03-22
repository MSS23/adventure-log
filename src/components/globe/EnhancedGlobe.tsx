'use client'

import { useRef, useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle, useId } from 'react'
import { flushSync } from 'react-dom'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation'
import { FlightAnimation } from './FlightAnimation'
import { CityPinSystem, type CityPin, type CityCluster } from './CityPinSystem'
import { AlbumImageModal } from './AlbumImageModal'
import type { GlobeInstance } from '@/types/globe'
import { GlobeSearch, type GlobeSearchResult } from './GlobeSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { createPinElement } from './createPinElement'

// Extracted hooks
import { useGlobePerformance } from './hooks/useGlobePerformance'
import { useGlobeVisibility } from './hooks/useGlobeVisibility'
import { useGlobeCamera } from './hooks/useGlobeCamera'
import { useGlobeNavigation } from './hooks/useGlobeNavigation'
import { useGlobeKeyboard } from './hooks/useGlobeKeyboard'

// Extracted sub-components
import { GlobeHeader } from './GlobeHeader'
import { GlobeFloatingControls } from './GlobeFloatingControls'
import { GlobeTimeline } from './GlobeTimeline'

// Shared types
import type { FlightPath, GlobeInternals, OrbitControls } from './types'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface EnhancedGlobeProps {
  className?: string
  initialAlbumId?: string
  initialLat?: number
  initialLng?: number
  filterUserId?: string
  hideHeader?: boolean // Hide the header when embedded in profile pages
  // Controlled year selection - when provided, external component manages year state
  selectedYear?: number | null
  onYearChange?: (year: number | null) => void
  // Callback when user clicks on globe background (not a pin)
  onGlobeBackgroundClick?: (coords: { lat: number; lng: number; screenX: number; screenY: number }) => void
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
  getAvailableYears: () => number[]
  getCanvas: () => HTMLCanvasElement | null
  flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => Promise<void>
}

export const EnhancedGlobe = forwardRef<EnhancedGlobeRef, EnhancedGlobeProps>(
  function EnhancedGlobe({ className, initialAlbumId, initialLat, initialLng, filterUserId, hideHeader = false, selectedYear: selectedYearProp, onYearChange: onYearChangeProp, onGlobeBackgroundClick }, ref) {
  // Generate a unique instance ID to prevent state sharing between globe instances
  const instanceId = useId()
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const modalOpenRef = useRef(false) // Track modal state for animation loop
  const [isAutoRotating, setIsAutoRotating] = useState(false) // Disabled by default for better performance
  const [userInteracting, setUserInteracting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showStaticConnections, setShowStaticConnections] = useState(true)
  const [arcsKey, setArcsKey] = useState(0) // Force re-render of arcs when needed
  const [progressionMode, setProgressionMode] = useState<'auto' | 'manual'>('auto')
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0)
  const [isJourneyPaused, setIsJourneyPaused] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const initialNavigationHandled = useRef(false)

  // Store navigation handler in ref to avoid dependency issues
  const navigationHandlerRef = useRef<((albumId: string, lat: number, lng: number) => void) | null>(null)
  // Store availableYears in ref for imperative access
  const availableYearsRef = useRef<number[]>([])

  // Extracted hooks
  const {
    effectivePerformanceMode,
    performanceConfig,
    globeImageUrl,
    rendererConfig
  } = useGlobePerformance()

  const {
    isVisibleRef: _isVisibleRef,
    isInViewportRef: _isInViewportRef,
    rendererRef,
    disposedRef: _disposedRef,
    shouldRender,
    windowDimensions,
    globeContainerRef
  } = useGlobeVisibility(globeRef, isAutoRotating, setIsAutoRotating, globeReady, setGlobeReady, hideHeader)

  const {
    calculateOptimalCameraPosition,
    animateCameraToPosition,
    cameraAnimationRef
  } = useGlobeCamera(globeRef)

  // Current location tracking
  const {
    location: currentLocation,
    loading: locationLoading,
    error: locationError,
    permissionStatus,
    requestLocation,
    clearLocation
  } = useCurrentLocation(false) // Don't auto-request, wait for user action
  const [showCurrentLocation, setShowCurrentLocation] = useState(false)

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
  }), [globeContainerRef])

  // Auto-dismiss location errors after 8 seconds (except permission denied)
  useEffect(() => {
    if (locationError && permissionStatus !== 'denied') {
      const timer = setTimeout(() => {
        clearLocation()
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [locationError, permissionStatus, clearLocation])

  // Travel timeline hook
  const {
    availableYears,
    loading: timelineLoading,
    error: timelineError,
    selectedYear: internalSelectedYear,
    setSelectedYear: setInternalSelectedYear,
    refreshData,
    getYearData
  } = useTravelTimeline(filterUserId, instanceId)

  // Support controlled mode: use external props if provided, otherwise use internal state
  const effectiveSelectedYear = selectedYearProp !== undefined ? selectedYearProp : internalSelectedYear
  const handleEffectiveYearChange = useCallback((year: number | null) => {
    if (onYearChangeProp) {
      onYearChangeProp(year)
    } else {
      setInternalSelectedYear(year)
    }
  }, [onYearChangeProp, setInternalSelectedYear])

  // Keep availableYearsRef in sync for imperative access
  useEffect(() => {
    availableYearsRef.current = availableYears
  }, [availableYears])

  // Get locations - show all years if no year is selected, otherwise filter by year
  const locations = useMemo(() => {
    if (effectiveSelectedYear) {
      const yearData = getYearData(effectiveSelectedYear)
      return yearData?.locations || []
    } else {
      const allLocations: TravelLocation[] = []
      availableYears.forEach(year => {
        const yearData = getYearData(year)
        if (yearData?.locations) {
          allLocations.push(...yearData.locations)
        }
      })
      return allLocations
    }
  }, [effectiveSelectedYear, availableYears, getYearData])

  // Album navigation (extracted hook)
  const {
    chronologicalAlbums,
    currentAlbumIndex,
    setCurrentAlbumIndex,
    currentAlbum,
    navigateToNextAlbum,
    navigateToPreviousAlbum,
    showCurrentAlbum,
    navigateToNextAlbumRef,
    navigateToPreviousAlbumRef,
    showCurrentAlbumRef,
    currentAlbumRef,
    chronologicalAlbumsRef
  } = useGlobeNavigation(
    globeRef,
    availableYears,
    getYearData,
    animateCameraToPosition,
    setActiveCityId,
    setSelectedCluster,
    setShowAlbumModal
  )

  // Stable flight animation callbacks
  const handleSegmentComplete = useCallback((location: TravelLocation) => {
    setActiveCityId(location.id)

    const locationIndex = locations.findIndex(loc => loc.id === location.id)
    if (locationIndex !== -1) {
      setCurrentLocationIndex(locationIndex)
    }

    if (progressionMode === 'manual') {
      setIsJourneyPaused(true)
      if (isPlaying) {
        pause()
      }
    }

    log.debug('Flight animation segment completed', {
      component: 'EnhancedGlobe',
      action: 'segment-complete',
      locationId: location.id,
      locationName: location.name,
      progressionMode,
      locationIndex
    })

    const delay = progressionMode === 'manual' ? 500 : 1500
    setTimeout(() => {
      const locationAlbums = location.albums || []
      const locationPhotos = location.photos || []

      if (locationAlbums.length > 0) {
        const cluster: CityCluster = {
          id: `location-${location.id}-${Date.now()}`,
          latitude: location.latitude,
          longitude: location.longitude,
          cities: [{
            id: location.id,
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            albumCount: locationAlbums.length,
            photoCount: locationPhotos.length,
            visitDate: location.visitDate.toISOString(),
            isVisited: true,
            isActive: true,
            favoritePhotoUrls: locationAlbums.flatMap(album => album.favoritePhotoUrls || []).slice(0, 3),
            coverPhotoUrl: locationAlbums[0]?.coverPhotoUrl,
            previewPhotoUrls: locationPhotos.map(p => p.url).filter((url): url is string => !!url)
          }],
          totalAlbums: locationAlbums.length,
          totalPhotos: locationPhotos.length,
          radius: 1
        }

        setSelectedCluster(cluster)
        setShowAlbumModal(true)
      }
    }, delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionMode, locations])

  // Animation complete callback
  const handleAnimationComplete = useCallback(() => {
    if (locations.length > 0) {
      const finalDestination = locations[locations.length - 1]
      if (globeRef.current) {
        const targetPOV = {
          lat: finalDestination.latitude,
          lng: finalDestination.longitude,
          altitude: 2.8
        }
        globeRef.current.pointOfView(targetPOV, 2000)
      }
      setActiveCityId(finalDestination.id)
    }
    log.info('Flight animation completed successfully', {
      component: 'EnhancedGlobe',
      action: 'animation-complete'
    })
  }, [locations])

  const handleAnimationError = useCallback((error: string) => {
    log.error('Flight animation failed', {
      component: 'EnhancedGlobe',
      action: 'animation-error',
      error: error
    })
  }, [])

  // Flight animation hook
  const {
    isPlaying,
    currentFlightState,
    cameraPosition,
    destinationCameraPosition,
    play,
    pause,
    reset,
    setLocations
  } = useFlightAnimation({
    autoPlay: false,
    defaultSpeed: 1,
    cameraFollowsPlane: true,
    onSegmentComplete: handleSegmentComplete,
    onAnimationComplete: handleAnimationComplete,
    onError: handleAnimationError
  })

  // UI control handlers
  const handleYearChange = useCallback((year: number) => {
    handleEffectiveYearChange(year)
    setActiveCityId(null)
    setSelectedCluster(null)
    reset()

    setTimeout(() => {
      const yearData = getYearData(year)
      if (yearData && yearData.locations.length > 0) {
        const optimalPosition = calculateOptimalCameraPosition(yearData.locations)
        animateCameraToPosition(optimalPosition, 2000, 'easeInOutExpo')
      }
    }, 500)
  }, [handleEffectiveYearChange, setActiveCityId, setSelectedCluster, reset, getYearData, calculateOptimalCameraPosition, animateCameraToPosition])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
      setUserInteracting(false)
    } else {
      play()
    }
  }, [isPlaying, pause, play])

  const handleReset = useCallback(() => {
    reset()
    setActiveCityId(null)
    setSelectedCluster(null)
    setCurrentLocationIndex(0)
    setIsJourneyPaused(false)
    setIsAutoRotating(true)
    if (globeRef.current) {
      animateCameraToPosition({ lat: 0, lng: 0, altitude: 3.5 }, 1500, 'easeInOutExpo')
    }
  }, [reset, setActiveCityId, setSelectedCluster, setIsAutoRotating, animateCameraToPosition])

  // Manual progression controls
  const advanceToNextLocation = useCallback(() => {
    if (currentLocationIndex >= locations.length - 1) return

    const nextIndex = currentLocationIndex + 1
    const nextLocation = locations[nextIndex]
    if (!nextLocation) return

    const locationAlbums = nextLocation.albums || []
    const locationPhotos = nextLocation.photos || []

    const cluster: CityCluster = {
      id: `location-${nextLocation.id}-${Date.now()}`,
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      cities: [{
        id: nextLocation.id,
        name: nextLocation.name,
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        albumCount: locationAlbums.length,
        photoCount: locationPhotos.length,
        visitDate: nextLocation.visitDate.toISOString(),
        isVisited: true,
        isActive: true,
        favoritePhotoUrls: locationAlbums.flatMap(album => album.favoritePhotoUrls || []).slice(0, 3),
        coverPhotoUrl: locationAlbums[0]?.coverPhotoUrl,
        previewPhotoUrls: locationPhotos.map(p => p.url).filter((url): url is string => !!url)
      }],
      totalAlbums: locationAlbums.length,
      totalPhotos: locationPhotos.length,
      radius: 1
    }

    flushSync(() => {
      setCurrentLocationIndex(nextIndex)
      setIsJourneyPaused(false)
      setActiveCityId(nextLocation.id)
      setSelectedCluster(cluster)
      setShowAlbumModal(true)
    })

    if (globeRef.current) {
      animateCameraToPosition({
        lat: nextLocation.latitude,
        lng: nextLocation.longitude,
        altitude: 2.8
      }, 1200, 'easeInOutCubic')
    }

    if (progressionMode === 'auto' && !isPlaying) {
      play()
    }
  }, [currentLocationIndex, locations, progressionMode, isPlaying, play, animateCameraToPosition])

  const goToPreviousLocation = useCallback(() => {
    if (currentLocationIndex <= 0) return

    const prevIndex = currentLocationIndex - 1
    const prevLocation = locations[prevIndex]
    if (!prevLocation) return

    const locationAlbums = prevLocation.albums || []
    const locationPhotos = prevLocation.photos || []

    const cluster: CityCluster = {
      id: `location-${prevLocation.id}-${Date.now()}`,
      latitude: prevLocation.latitude,
      longitude: prevLocation.longitude,
      cities: [{
        id: prevLocation.id,
        name: prevLocation.name,
        latitude: prevLocation.latitude,
        longitude: prevLocation.longitude,
        albumCount: locationAlbums.length,
        photoCount: locationPhotos.length,
        visitDate: prevLocation.visitDate.toISOString(),
        isVisited: true,
        isActive: true,
        favoritePhotoUrls: locationAlbums.flatMap(album => album.favoritePhotoUrls || []).slice(0, 3),
        coverPhotoUrl: locationAlbums[0]?.coverPhotoUrl,
        previewPhotoUrls: locationPhotos.map(p => p.url).filter((url): url is string => !!url)
      }],
      totalAlbums: locationAlbums.length,
      totalPhotos: locationPhotos.length,
      radius: 1
    }

    flushSync(() => {
      setCurrentLocationIndex(prevIndex)
      setIsJourneyPaused(false)
      setActiveCityId(prevLocation.id)
      setSelectedCluster(cluster)
      setShowAlbumModal(true)
    })

    if (globeRef.current) {
      animateCameraToPosition({
        lat: prevLocation.latitude,
        lng: prevLocation.longitude,
        altitude: 2.8
      }, 1200, 'easeInOutCubic')
    }

    if (progressionMode === 'auto' && !isPlaying) {
      play()
    }
  }, [currentLocationIndex, locations, progressionMode, isPlaying, play, animateCameraToPosition])

  const resumeJourney = useCallback(() => {
    if (isJourneyPaused && progressionMode === 'manual') {
      setIsJourneyPaused(false)
      play()
    }
  }, [isJourneyPaused, progressionMode, play])

  const toggleProgressionMode = useCallback(() => {
    const newMode = progressionMode === 'auto' ? 'manual' : 'auto'
    setProgressionMode(newMode)

    if (newMode === 'auto' && isJourneyPaused) {
      setIsJourneyPaused(false)
      if (!isPlaying && currentLocationIndex < locations.length - 1) {
        play()
      }
    }
  }, [progressionMode, isJourneyPaused, isPlaying, currentLocationIndex, locations, play])

  // Keyboard shortcuts (extracted hook)
  useGlobeKeyboard({
    locations,
    effectiveSelectedYear,
    availableYears,
    progressionMode,
    isJourneyPaused,
    showSearch,
    handlePlayPause,
    handleReset,
    handleYearChange,
    toggleProgressionMode,
    advanceToNextLocation,
    goToPreviousLocation,
    resumeJourney,
    navigateToNextAlbumRef,
    navigateToPreviousAlbumRef,
    showCurrentAlbumRef,
    currentAlbumRef,
    chronologicalAlbumsRef,
    setShowSearch,
    setShowAlbumModal,
    setSelectedCluster,
  })

  // Prepare search data
  const searchData: GlobeSearchResult[] = useMemo(() => {
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      country: location.name,
      visitDate: location.visitDate.toISOString(),
      albumCount: location.albums.length,
      photoCount: location.photos.length,
      coverPhotoUrl: location.albums[0]?.coverPhotoUrl,
      tags: [],
      type: 'location' as const
    }))
  }, [locations])

  // Calculate unique countries and cities for percentage stats
  const travelStats = useMemo(() => {
    const uniqueCountries = new Set(
      locations
        .map(loc => {
          const parts = loc.name.split(',').map((p: string) => p.trim())
          return parts[parts.length - 1] || ''
        })
        .filter(country => country.length > 0)
    )

    const uniqueCities = new Set(
      locations
        .map(loc => {
          const parts = loc.name.split(',').map((p: string) => p.trim())
          return parts[0] || loc.name
        })
        .filter(city => city.length > 0)
    )

    const totalCountriesInWorld = 195
    const totalMajorCitiesInWorld = 10000

    return {
      countriesVisited: uniqueCountries.size,
      citiesVisited: uniqueCities.size,
      countriesPercentage: ((uniqueCountries.size / totalCountriesInWorld) * 100).toFixed(1),
      citiesPercentage: ((uniqueCities.size / totalMajorCitiesInWorld) * 100).toFixed(2)
    }
  }, [locations])

  // Dynamic color generation for any year
  const getYearColor = useCallback((year: number): string => {
    const colorPalette = [
      '#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#67e8f9',
      '#fdba74', '#f9a8d4', '#6ee7b7', '#a5b4fc', '#d8b4fe', '#fde68a',
      '#fda4af', '#99f6e4', '#a5b4fc', '#fed7aa',
    ]
    const colorIndex = Math.abs(year) % colorPalette.length
    return colorPalette[colorIndex]
  }, [])

  // Convert locations to city pins
  const cityPins: CityPin[] = useMemo(() => {
    const maxPins = performanceConfig.maxPins
    const limitedLocations = locations.slice(0, maxPins)

    return limitedLocations.map(location => {
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

      const finalCoverPhotoUrl = coverPhotoUrl ||
                                 (favoritePhotoUrls.length > 0 ? favoritePhotoUrls[0] : undefined) ||
                                 (location.photos.length > 0 ? location.photos[0].url : undefined)

      const previewPhotoUrls = location.photos.map(p => p.url).filter(url => url)

      return {
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        albumCount: location.albums.length,
        photoCount: album?.photoCount || location.photos.length,
        visitDate: location.visitDate.toISOString(),
        isVisited: true,
        isActive: activeCityId === location.id,
        favoritePhotoUrls: fallbackPhotoUrls,
        coverPhotoUrl: finalCoverPhotoUrl,
        previewPhotoUrls
      }
    })
  }, [locations, activeCityId, performanceConfig.maxPins])

  // Static connection arcs
  const staticConnections = useMemo(() => {
    if (!showStaticConnections || locations.length < 2) return []

    const maxConnections = performanceConfig.maxPins - 1
    const limitedLocations = locations.slice(0, maxConnections + 1)

    const sortedLocations = [...limitedLocations].sort((a, b) =>
      new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
    )

    const paths: FlightPath[] = []

    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const current = sortedLocations[i]
      const next = sortedLocations[i + 1]

      const currentYear = new Date(current.visitDate).getFullYear()
      const nextYear = new Date(next.visitDate).getFullYear()

      const shouldConnect = effectiveSelectedYear === null || currentYear === nextYear

      if (shouldConnect) {
        const dLat = next.latitude - current.latitude
        const dLng = next.longitude - current.longitude
        const distance = Math.sqrt(dLat * dLat + dLng * dLng)

        paths.push({
          startLat: current.latitude,
          startLng: current.longitude,
          endLat: next.latitude,
          endLng: next.longitude,
          color: getYearColor(currentYear),
          endColor: getYearColor(nextYear),
          year: currentYear,
          name: `${current.name} → ${next.name}`,
          distance,
          index: i,
          total: sortedLocations.length - 1,
        })
      }
    }

    return paths
  }, [locations, showStaticConnections, getYearColor, effectiveSelectedYear, performanceConfig.maxPins])

  // Get city pin system data
  const cityPinSystem = CityPinSystem({
    cities: cityPins,
    onCityClick: handleCityClick,
    onClusterClick: handleClusterClick,
    activeCity: activeCityId
  })

  // Combine city pins with current location pin
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
      isCurrentLocation?: boolean;
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

    return pins
  }, [cityPinSystem.pinData, currentLocation, showCurrentLocation])

  // Update flight animation when locations change
  useEffect(() => {
    if (locations.length > 1) {
      setLocations(locations)
    }
  }, [locations, setLocations])

  // Update camera position from flight animation
  useEffect(() => {
    if (cameraPosition && globeRef.current) {
      animateCameraToPosition(cameraPosition, 1500, 'easeInOutCubic')
    }
  }, [cameraPosition, animateCameraToPosition])

  // Handle destination camera movement when flight segment completes
  useEffect(() => {
    if (destinationCameraPosition && globeRef.current && !isPlaying) {
      setTimeout(() => {
        animateCameraToPosition(destinationCameraPosition, 2500, 'easeInOutCubic')
      }, 500)
    }
  }, [destinationCameraPosition, isPlaying, animateCameraToPosition])

  // Auto-rotation functionality
  useEffect(() => {
    if (!globeRef.current || !isAutoRotating || userInteracting) {
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current as unknown as number)
        autoRotateRef.current = null
      }
      return
    }

    let lastTime = Date.now()
    const rotationSpeed = 0.1

    const animate = () => {
      if (globeRef.current && !userInteracting && isAutoRotating) {
        const currentTime = Date.now()
        const deltaTime = currentTime - lastTime
        lastTime = currentTime

        const rotationAmount = rotationSpeed * (deltaTime / 16.67)

        const pov = globeRef.current.pointOfView()
        globeRef.current.pointOfView({
          ...pov,
          lng: (pov.lng + rotationAmount) % 360
        }, 0)

        autoRotateRef.current = requestAnimationFrame(animate) as unknown as NodeJS.Timeout
      }
    }

    autoRotateRef.current = requestAnimationFrame(animate) as unknown as NodeJS.Timeout

    return () => {
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current as unknown as number)
        autoRotateRef.current = null
      }
    }
  }, [isAutoRotating, userInteracting])

  // Modal state management - Pause rendering when modal is open
  useEffect(() => {
    modalOpenRef.current = showAlbumModal

    if (showAlbumModal) {
      if (isAutoRotating) {
        setIsAutoRotating(false)
      }

      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
      }

      if (globeRef.current) {
        const controls = globeRef.current.controls() as OrbitControls | undefined
        if (controls && 'enabled' in controls) {
          controls.enabled = false
        }
      }
    } else {
      if (rendererRef.current && shouldRender()) {
        if (globeRef.current) {
          const controls = globeRef.current.controls() as OrbitControls | undefined
          if (controls && 'enabled' in controls) {
            controls.enabled = true
          }
        }

        const globeMethods = globeRef.current as unknown as GlobeInternals
        if (globeMethods.renderer) {
          const renderer = globeMethods.renderer()
          if (renderer) {
            log.info('Modal closed, resumed WebGL animation', { component: 'EnhancedGlobe' })
          }
        }
      }
    }
  }, [showAlbumModal, isAutoRotating, shouldRender, rendererRef])

  // Cleanup auto-rotate and camera animation on unmount
  useEffect(() => {
    return () => {
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current as unknown as number)
        autoRotateRef.current = null
      }
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current)
        cameraAnimationRef.current = null
      }
    }
  }, [cameraAnimationRef])

  // Handle initial navigation from feed button - only once
  useEffect(() => {
    if (initialNavigationHandled.current || !globeReady || !initialAlbumId || !initialLat || !initialLng || chronologicalAlbums.length === 0) {
      return
    }

    const albumIndex = chronologicalAlbums.findIndex(album => album.albumId === initialAlbumId)
    if (albumIndex === -1) return

    initialNavigationHandled.current = true

    const album = chronologicalAlbums[albumIndex]

    handleEffectiveYearChange(null)
    setCurrentAlbumIndex(albumIndex)

    const locationIndex = locations.findIndex(loc => loc.id === initialAlbumId)
    if (locationIndex !== -1) {
      setCurrentLocationIndex(locationIndex)
    }

    setIsAutoRotating(false)

    animateCameraToPosition({
      lat: initialLat,
      lng: initialLng,
      altitude: 0.8
    }, 2500, 'easeInOutCubic')

    setTimeout(() => {
      const city = cityPins.find(pin => pin.id === initialAlbumId)
      if (city) {
        const singleCityCluster: CityCluster = {
          id: `album-${album.albumId}`,
          latitude: album.latitude,
          longitude: album.longitude,
          cities: [city],
          totalAlbums: 1,
          totalPhotos: album.photoCount,
          radius: 1
        }

        setSelectedCluster(singleCityCluster)
        setShowAlbumModal(true)
        setActiveCityId(city.id)
      }
    }, 2800)
  }, [globeReady, initialAlbumId, initialLat, initialLng, chronologicalAlbums, cityPins, animateCameraToPosition, locations, handleEffectiveYearChange, setCurrentAlbumIndex])

  // Auto-position to current location when available
  useEffect(() => {
    if (initialAlbumId && initialLat && initialLng) return
    if (currentLocation && showCurrentLocation && globeReady && !initialNavigationHandled.current) {
      animateCameraToPosition({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        altitude: 3.0
      }, 2000, 'easeInOutCubic')
    }
  }, [initialAlbumId, initialLat, initialLng, currentLocation, showCurrentLocation, globeReady, animateCameraToPosition])

  // Search and preview functions
  const handleSearchResult = useCallback((result: GlobeSearchResult) => {
    const location = locations.find(loc => loc.id === result.id)
    if (location) {
      setActiveCityId(result.id)
      setIsAutoRotating(false)
      animateCameraToPosition({
        lat: result.latitude,
        lng: result.longitude,
        altitude: 2.8
      }, 1500, 'easeInOutCubic')
    }
  }, [locations, animateCameraToPosition])

  function handleCityClick(city: CityPin) {
    setActiveCityId(city.id)
    setIsAutoRotating(false)

    const albumIndex = chronologicalAlbums.findIndex(
      album => album.locationId === city.id || album.albumId === city.id
    )
    if (albumIndex !== -1) {
      setCurrentAlbumIndex(albumIndex)
    }

    const singleCityCluster: CityCluster = {
      id: `single-${city.id}-${Date.now()}`,
      latitude: city.latitude,
      longitude: city.longitude,
      cities: [city],
      totalAlbums: city.albumCount,
      totalPhotos: city.photoCount,
      radius: 1
    }

    setSelectedCluster(singleCityCluster)
    setShowAlbumModal(true)

    if (globeRef.current) {
      animateCameraToPosition({
        lat: city.latitude,
        lng: city.longitude,
        altitude: 2.8
      }, 1200, 'easeInOutCubic')
    }
  }

  function handleClusterClick(cluster: CityCluster) {
    setSelectedCluster(cluster)
    setShowAlbumModal(true)
    setIsAutoRotating(false)

    if (cluster.cities.length > 0) {
      const firstCityId = cluster.cities[0].id
      const albumIndex = chronologicalAlbums.findIndex(
        album => album.locationId === firstCityId || album.albumId === firstCityId
      )
      if (albumIndex !== -1) {
        setCurrentAlbumIndex(albumIndex)
      }
    }

    if (progressionMode === 'auto') {
      setProgressionMode('manual')
      pause()
      setIsJourneyPaused(true)
    }

    if (globeRef.current) {
      animateCameraToPosition({
        lat: cluster.latitude,
        lng: cluster.longitude,
        altitude: 2.5
      }, 1200, 'easeInOutCubic')
    }
  }

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

  // Location toggle handler for floating controls
  const handleLocationToggle = useCallback(async () => {
    if (showCurrentLocation && currentLocation) {
      setShowCurrentLocation(false)
      clearLocation()
    } else if (permissionStatus === 'denied') {
      return
    } else {
      await requestLocation()
      if (!locationError) {
        setShowCurrentLocation(true)
      }
    }
  }, [showCurrentLocation, currentLocation, permissionStatus, requestLocation, locationError, clearLocation])

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
                    handleCityClick
                  })}

                  // Animation rings disabled for performance
                  ringsData={[]}
                  ringLat={(d: object) => (d as { lat: number }).lat}
                  ringLng={(d: object) => (d as { lng: number }).lng}
                  ringMaxRadius={0}
                  ringPropagationSpeed={0}
                  ringRepeatPeriod={0}
                  ringColor={() => 'transparent'}

                  // Travel arcs
                  arcsData={performanceConfig.showArcs && showStaticConnections ? [...staticConnections] : []}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={(d: object) => {
                    const path = d as FlightPath
                    const progress = path.total > 1 ? path.index / (path.total - 1) : 0.5
                    const colors = [
                      ['rgba(124,154,62,0.9)', 'rgba(153,177,105,0.5)'],
                      ['rgba(196,175,93,0.9)', 'rgba(218,200,130,0.5)'],
                      ['rgba(99,206,180,0.85)', 'rgba(134,220,200,0.45)'],
                      ['rgba(147,165,220,0.85)', 'rgba(170,185,235,0.45)'],
                    ]
                    const colorIdx = Math.floor(progress * (colors.length - 1))
                    const pair = colors[Math.min(colorIdx, colors.length - 1)]
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
                    return performanceConfig.arcStroke * (0.8 + recency * 0.4)
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

                {!globeReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
                  </div>
                )}

        </div>
      </div>

      {/* Additional Help */}
      {showSearch && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="bg-olive-900/80 text-white text-sm p-2">
            <div className="space-y-1">
              <div><kbd className="bg-white/20 px-1 rounded">⌃K</kbd> Search</div>
              <div><kbd className="bg-white/20 px-1 rounded">↑↓</kbd> Navigate</div>
              <div><kbd className="bg-white/20 px-1 rounded">⏎</kbd> Select</div>
              <div><kbd className="bg-white/20 px-1 rounded">Esc</kbd> Close</div>
            </div>
          </Card>
        </div>
      )}

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
        showProgressionControls={chronologicalAlbums.length > 1}
        currentLocationIndex={currentAlbumIndex}
        totalLocations={chronologicalAlbums.length}
        progressionMode={progressionMode}
        onNextLocation={navigateToNextAlbum}
        onPreviousLocation={navigateToPreviousAlbum}
        onContinueJourney={resumeJourney}
        canGoNext={currentAlbumIndex < chronologicalAlbums.length - 1}
        canGoPrevious={currentAlbumIndex > 0}
      />

    </div>
  )
})

EnhancedGlobe.displayName = 'EnhancedGlobe'
