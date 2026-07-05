'use client'

import { useRef, useEffect, useState, useMemo, useCallback, useId } from 'react'
import { flushSync } from 'react-dom'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { CityPin, CityCluster } from '../CityPinSystem'
import type { GlobeSearchResult } from '../GlobeSearch'
import type { FlightPath } from '../types'
import { useGlobePerformance } from './useGlobePerformance'
import { useGlobeVisibility } from './useGlobeVisibility'
import { useGlobeCamera } from './useGlobeCamera'
import { useGlobeNavigation } from './useGlobeNavigation'
import { useGlobeKeyboard } from './useGlobeKeyboard'
import { log } from '@/lib/utils/logger'

interface UseGlobeStateOptions {
  filterUserId?: string
  hideHeader?: boolean
  selectedYear?: number | null
  onYearChange?: (year: number | null) => void
  initialAlbumId?: string
  initialLat?: number
  initialLng?: number
  onGlobeBackgroundClick?: (coords: { lat: number; lng: number; screenX: number; screenY: number }) => void
}

export function useGlobeState(options: UseGlobeStateOptions) {
  const {
    filterUserId,
    hideHeader = false,
    selectedYear: selectedYearProp,
    onYearChange: onYearChangeProp,
    initialAlbumId,
    initialLat,
    initialLng,
  } = options

  // Generate a unique instance ID to prevent state sharing between globe instances
  const instanceId = useId()
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const modalOpenRef = useRef(false)
  // Respect the OS "Reduce motion" preference: never auto-rotate the globe and
  // let consumers (EnhancedGlobe) render static arcs instead of animated ones.
  const prefersReducedMotion = useReducedMotion()
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [userInteracting, setUserInteracting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showStaticConnections, setShowStaticConnections] = useState(true)
  const [_arcsKey, setArcsKey] = useState(0)
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
  } = useCurrentLocation(false)
  const [showCurrentLocation, setShowCurrentLocation] = useState(false)
  // Tracks an in-flight requestLocation() triggered by handleLocationToggle.
  const locationRequestPendingRef = useRef(false)

  // WHY: requestLocation() resolves before React commits the hook's state
  // updates, so reading currentLocation/locationError right after the await
  // sees stale closure values. React to the hook's fresh state instead: once
  // the request settles (loading goes false), show the marker only on success.
  useEffect(() => {
    if (!locationRequestPendingRef.current || locationLoading) return
    locationRequestPendingRef.current = false
    if (currentLocation && !locationError) {
      setShowCurrentLocation(true)
    }
  }, [locationLoading, currentLocation, locationError])

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
    getYearData,
    homeLocation
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
    currentAlbum: _currentAlbum,
    navigateToNextAlbum,
    navigateToPreviousAlbum,
    showCurrentAlbum: _showCurrentAlbum,
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
    // Don't claim we're rotating when reduced motion suppresses the loop
    setIsAutoRotating(!prefersReducedMotion)
    if (globeRef.current) {
      animateCameraToPosition({ lat: 0, lng: 0, altitude: 3.5 }, 1500, 'easeInOutExpo')
    }
  }, [reset, setActiveCityId, setSelectedCluster, setIsAutoRotating, animateCameraToPosition, prefersReducedMotion])

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

  // Travel arcs — "home hub" model.
  //
  // Trips are grouped into JOURNEYS using explicit connected_from_album_id
  // chains (migration 75). Each maximal chain a0→a1→…→an is one journey; a trip
  // with no connection is a journey of length 1. Then:
  //
  //   • With a base/home location (homeLocation): every journey is anchored to
  //     home — home→a0 (outbound), a0→a1→… (the journey's own legs), an→home
  //     (return). So two SEPARATE trips read as London→Paris and London→Tokyo
  //     (each looping home), never Paris→Tokyo. A connected France→Japan trip
  //     reads as London→France→Japan→London.
  //
  //   • Without a base (viewer's home is private / unset): only the explicit
  //     trip→trip legs are drawn. Standalone trips get no arc; connected trips
  //     still link to each other. This is the "hide my base" behaviour.
  //
  // A single-year selection already narrows `locations` to that year, so
  // cross-year chain predecessors simply aren't in view and those trips fall
  // back to being home-anchored heads — which is what we want per-year.
  const staticConnections = useMemo(() => {
    if (!showStaticConnections || locations.length === 0) return []

    const byId = new Map(locations.map((loc) => [loc.id, loc]))
    const maxConnections = performanceConfig.maxPins
    const paths: FlightPath[] = []

    const yearOf = (loc: TravelLocation) => new Date(loc.visitDate).getFullYear()

    // Any node with a lat/lng/name — home or a trip — so arcs share one shape.
    type ArcNode = { latitude: number; longitude: number; name: string }
    const pushArc = (
      from: ArcNode,
      to: ArcNode,
      kind: 'home' | 'journey',
      fromYear: number,
      toYear: number,
    ) => {
      const dLat = to.latitude - from.latitude
      const dLng = to.longitude - from.longitude
      const distance = Math.sqrt(dLat * dLat + dLng * dLng)
      paths.push({
        startLat: from.latitude,
        startLng: from.longitude,
        endLat: to.latitude,
        endLng: to.longitude,
        color: getYearColor(fromYear),
        endColor: getYearColor(toYear),
        year: toYear,
        name: `${from.name} → ${to.name}`,
        distance,
        index: paths.length,
        total: 0, // filled in below once the count is known
        kind,
      })
    }

    // A trip is "chained" when its declared predecessor is present in view.
    const predecessorInView = (loc: TravelLocation) => {
      const fromId = loc.connectedFromAlbumId
      return !!(fromId && fromId !== loc.id && byId.has(fromId))
    }

    // successorsOf: predecessor id → trips that continue from it.
    const successorsOf = new Map<string, TravelLocation[]>()
    for (const loc of locations) {
      if (!predecessorInView(loc)) continue
      const fromId = loc.connectedFromAlbumId as string
      const list = successorsOf.get(fromId)
      if (list) list.push(loc)
      else successorsOf.set(fromId, [loc])
    }

    // Journey heads = trips with no predecessor in view, oldest first for
    // stable arc ordering (and stable dash offsets / colors).
    const heads = locations
      .filter((loc) => !predecessorInView(loc))
      .sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())

    const home: ArcNode | null = homeLocation
      ? { latitude: homeLocation.latitude, longitude: homeLocation.longitude, name: homeLocation.name }
      : null

    const visited = new Set<string>()

    for (const head of heads) {
      if (paths.length >= maxConnections) break
      if (visited.has(head.id)) continue

      // Walk the chain forward. If a trip branches (rare), follow the earliest
      // unvisited successor; cycle-safe via `visited`.
      const chain: TravelLocation[] = []
      let cur: TravelLocation | undefined = head
      while (cur && !visited.has(cur.id)) {
        visited.add(cur.id)
        chain.push(cur)
        const next = (successorsOf.get(cur.id) || [])
          .filter((s) => !visited.has(s.id))
          .sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())
        cur = next[0]
      }

      const first = chain[0]
      const last = chain[chain.length - 1]

      // Outbound from home to the start of the journey.
      if (home) {
        pushArc(home, first, 'home', yearOf(first), yearOf(first))
      }

      // The journey's own legs (only present for multi-stop journeys).
      for (let i = 0; i < chain.length - 1; i++) {
        if (paths.length >= maxConnections) break
        pushArc(chain[i], chain[i + 1], 'journey', yearOf(chain[i]), yearOf(chain[i + 1]))
      }

      // Return home. Skipped for a single-stop journey (the outbound arc is the
      // same great circle reversed — drawing both just doubles it up).
      if (home && chain.length >= 2 && paths.length < maxConnections) {
        pushArc(last, home, 'home', yearOf(last), yearOf(last))
      }
    }

    const total = paths.length
    for (const p of paths) p.total = total

    return paths
  }, [locations, showStaticConnections, getYearColor, homeLocation, performanceConfig.maxPins])

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

  // Auto-rotation functionality (skipped entirely for reduced-motion users)
  useEffect(() => {
    if (!globeRef.current || !isAutoRotating || userInteracting || prefersReducedMotion) {
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
  }, [isAutoRotating, userInteracting, prefersReducedMotion])

  // Modal state management - Pause rendering / interaction while a modal is open.
  //
  // IMPORTANT: we deliberately do NOT call `setAnimationLoop(null)` here. The
  // render loop installed in `onGlobeReady` already early-returns while
  // `modalOpenRef.current` is true, so rendering pauses automatically AND
  // resumes the instant the modal closes. Calling `setAnimationLoop(null)`
  // permanently kills Three.js's loop (nothing re-installs react-globe's render
  // tick), which froze the globe after closing an album modal — it could no
  // longer spin or zoom because frames were never drawn again.
  useEffect(() => {
    modalOpenRef.current = showAlbumModal

    // Disable orbit controls while the modal is up so drags don't move the
    // globe behind it; re-enable as soon as it closes.
    if (globeRef.current) {
      const controls = globeRef.current.controls() as { enabled?: boolean } | undefined
      if (controls && 'enabled' in controls) {
        controls.enabled = !showAlbumModal
      }
    }

    if (showAlbumModal && isAutoRotating) {
      setIsAutoRotating(false)
    }
  }, [showAlbumModal, isAutoRotating, setIsAutoRotating, globeRef, modalOpenRef])

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

    // 2.2 keeps the destination centered with continental context — the old
    // 0.8 was a near-ground close-up that read as "zoomed in too much" right
    // as the album card opened over it (worst on phone screens).
    animateCameraToPosition({
      lat: initialLat,
      lng: initialLng,
      altitude: 2.2
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
    // Fly to ANY picked result. Only visited locations get an active pin —
    // external geocoder results (id `external-*`) have no pin, but the old
    // early-return made clicking them do nothing at all, which read as
    // "search is broken".
    const location = locations.find(loc => loc.id === result.id)
    setActiveCityId(location ? result.id : null)
    setIsAutoRotating(false)
    animateCameraToPosition({
      lat: result.latitude,
      lng: result.longitude,
      altitude: 2.8
    }, 1500, 'easeInOutCubic')
  }, [locations, animateCameraToPosition])

  // `openModal` controls whether a city tap opens the AlbumImageModal preview.
  // Both direct globe-pin taps and filmstrip-driven navigation now open it
  // (it is the single album card); callers may still pass openModal=false to
  // fly the camera without surfacing the card.
  //
  // Both handlers are useCallback'd because they feed (via useCityPinSystem
  // and the memoized htmlElement accessor) into three-globe's pin layer —
  // unstable identities here would rebuild every pin's DOM element per render.
  const handleCityClick = useCallback((city: CityPin, openModal: boolean = true) => {
    setActiveCityId(city.id)
    setIsAutoRotating(false)

    const albumIndex = chronologicalAlbums.findIndex(
      album => album.locationId === city.id || album.albumId === city.id
    )
    if (albumIndex !== -1) {
      setCurrentAlbumIndex(albumIndex)
    }

    if (openModal) {
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
    }

    if (globeRef.current) {
      animateCameraToPosition({
        lat: city.latitude,
        lng: city.longitude,
        altitude: 2.8
      }, 1200, 'easeInOutCubic')
    }
  }, [chronologicalAlbums, setCurrentAlbumIndex, animateCameraToPosition, globeRef])

  const handleClusterClick = useCallback((cluster: CityCluster) => {
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
  }, [chronologicalAlbums, setCurrentAlbumIndex, progressionMode, pause, animateCameraToPosition, globeRef])

  // Location toggle handler for floating controls
  const handleLocationToggle = useCallback(async () => {
    if (showCurrentLocation && currentLocation) {
      setShowCurrentLocation(false)
      clearLocation()
    } else if (permissionStatus === 'denied') {
      return
    } else {
      // Mark the request in-flight; the effect near useCurrentLocation() reads
      // the outcome from fresh state (a stale locationError read here would
      // show the marker on failure and hide it on a successful retry).
      locationRequestPendingRef.current = true
      await requestLocation()
    }
  }, [showCurrentLocation, currentLocation, permissionStatus, requestLocation, clearLocation])

  return {
    // Refs
    globeRef,
    modalOpenRef,
    autoRotateRef,
    navigationHandlerRef,
    availableYearsRef,
    rendererRef,
    globeContainerRef,
    cameraAnimationRef,

    // State
    globeReady,
    setGlobeReady,
    selectedCluster,
    setSelectedCluster,
    showAlbumModal,
    setShowAlbumModal,
    activeCityId,
    setActiveCityId,
    isAutoRotating,
    setIsAutoRotating,
    prefersReducedMotion,
    userInteracting,
    setUserInteracting,
    showSearch,
    setShowSearch,
    showStaticConnections,
    setShowStaticConnections,
    setArcsKey,
    progressionMode,
    currentLocationIndex,
    isJourneyPaused,
    showCurrentLocation,
    setShowCurrentLocation,

    // Performance
    effectivePerformanceMode,
    performanceConfig,
    globeImageUrl,
    rendererConfig,

    // Visibility
    shouldRender,
    windowDimensions,

    // Camera
    calculateOptimalCameraPosition,
    animateCameraToPosition,

    // Current location
    currentLocation,
    locationLoading,
    locationError,
    permissionStatus,
    clearLocation,

    // Timeline
    availableYears,
    timelineLoading,
    timelineError,
    effectiveSelectedYear,
    handleEffectiveYearChange,
    refreshData,
    getYearData,

    // Locations
    locations,

    // Navigation
    chronologicalAlbums,
    currentAlbumIndex,
    navigateToNextAlbum,
    navigateToPreviousAlbum,
    resumeJourney,

    // Flight animation
    isPlaying,
    currentFlightState,
    destinationCameraPosition,

    // Handlers
    handleYearChange,
    handlePlayPause,
    handleReset,
    handleSearchResult,
    handleCityClick,
    handleClusterClick,
    handleLocationToggle,

    // Computed data
    searchData,
    travelStats,
    getYearColor,
    cityPins,
    staticConnections,
    homeLocation,
  }
}
