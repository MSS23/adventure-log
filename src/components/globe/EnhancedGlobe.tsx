'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { flushSync } from 'react-dom'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation, type Album } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { FlightAnimation } from './FlightAnimation'
import { CityPinSystem, formatPinTooltip, type CityPin, type CityCluster } from './CityPinSystem'
import { AlbumImageModal } from './AlbumImageModal'
import type { GlobeInstance, GlobeHtmlElement } from '@/types/globe'
import { GlobeSearch, type GlobeSearchResult } from './GlobeSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Globe as GlobeIcon,
  Plus,
  Loader2,
  RotateCcw,
  Play,
  Pause,
  Plane,
  Route,
  Search,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface FlightPath {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  year: number
  name: string
}

// Type definitions for accessing Three.js renderer internals
interface GlobeInternals {
  scene?: () => unknown
  renderer?: () => ThreeRenderer | undefined
}

interface ThreeRenderer {
  setAnimationLoop: (callback: ((time: number) => void) | null) => void
}

interface EnhancedGlobeProps {
  className?: string
  initialAlbumId?: string
  initialLat?: number
  initialLng?: number
  filterUserId?: string
}

export function EnhancedGlobe({ className, initialAlbumId, initialLat, initialLng, filterUserId }: EnhancedGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)
  const [isAutoRotating, setIsAutoRotating] = useState(false) // Disabled by default for better performance
  const [userInteracting, setUserInteracting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 800, height: 500 })
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0)
  const [showStaticConnections, setShowStaticConnections] = useState(true)
  const [progressionMode, setProgressionMode] = useState<'auto' | 'manual'>('auto')
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0)
  const [isJourneyPaused, setIsJourneyPaused] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const cameraAnimationRef = useRef<number | null>(null)
  const initialNavigationHandled = useRef(false)

  // Performance settings - automatically optimized based on hardware detection
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'balanced' | 'low'>('auto')
  const [hardwareAcceleration, setHardwareAcceleration] = useState<boolean | null>(null)

  // Detect hardware acceleration
  useEffect(() => {
    const detectHardwareAcceleration = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

        if (!gl) {
          setHardwareAcceleration(false)
          // Auto-switch to low mode for better performance
          setPerformanceMode('low')
          log.warn('WebGL not available, using low performance mode')
          return
        }

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          // Check if using software renderer
          const isSoftware = /SwiftShader|llvmpipe|Microsoft Basic Render Driver/i.test(renderer)
          setHardwareAcceleration(!isSoftware)

          if (isSoftware) {
            // Auto-switch to low mode for software rendering
            setPerformanceMode('low')
            log.warn('Software rendering detected, using low performance mode', { renderer })
          } else {
            log.info('Hardware acceleration detected', { renderer })
          }
        } else {
          // Can't detect, assume hardware acceleration is available
          setHardwareAcceleration(true)
        }
      } catch (error) {
        log.error('Failed to detect hardware acceleration', { error })
        setHardwareAcceleration(true)
      }
    }

    detectHardwareAcceleration()
  }, [])


  // Handle window resize for responsive globe - Throttled for performance
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null = null

    const updateDimensions = () => {
      const width = Math.min(window.innerWidth * 0.9, 1200)
      const height = window.innerWidth < 640 ? Math.max(window.innerHeight * 0.6, 500) :
                    window.innerWidth < 1024 ? Math.max(window.innerHeight * 0.65, 650) :
                    window.innerWidth < 1440 ? Math.max(window.innerHeight * 0.75, 750) :
                    Math.max(window.innerHeight * 0.8, 800)
      setWindowDimensions({ width, height })
    }

    const throttledResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      resizeTimeout = setTimeout(updateDimensions, 250)
    }

    updateDimensions()
    window.addEventListener('resize', throttledResize)
    return () => {
      window.removeEventListener('resize', throttledResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, [])


  // Calculate effective performance mode
  const effectivePerformanceMode = useMemo(() => {
    if (performanceMode !== 'auto') return performanceMode
    // Auto mode: use low if no hardware acceleration, balanced otherwise
    return hardwareAcceleration === false ? 'low' : 'balanced'
  }, [performanceMode, hardwareAcceleration])

  // Performance settings based on mode
  const performanceConfig = useMemo(() => {
    switch (effectivePerformanceMode) {
      case 'high':
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.8,
          atmosphereAltitude: 0.25,
          arcStroke: 3,
          showArcs: true,
          pinSize: 1.2,
          maxPins: 1000
        }
      case 'balanced':
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.6,
          atmosphereAltitude: 0.15,
          arcStroke: 2,
          showArcs: true,
          pinSize: 1.0,
          maxPins: 500
        }
      case 'low':
        return {
          showAtmosphere: false,
          atmosphereOpacity: 0,
          atmosphereAltitude: 0,
          arcStroke: 1,
          showArcs: false,
          pinSize: 0.8,
          maxPins: 200
        }
      default:
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.6,
          atmosphereAltitude: 0.15,
          arcStroke: 2,
          showArcs: true,
          pinSize: 1.0,
          maxPins: 500
        }
    }
  }, [effectivePerformanceMode])

  // Travel timeline hook
  const {
    availableYears,
    loading: timelineLoading,
    error: timelineError,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData
  } = useTravelTimeline(filterUserId)

  // Get locations - show all years if no year is selected, otherwise filter by year
  const locations = useMemo(() => {
    if (selectedYear) {
      // Filter by selected year
      const yearData = getYearData(selectedYear)
      return yearData?.locations || []
    } else {
      // Show all years - combine all locations from all years
      const allLocations: TravelLocation[] = []
      availableYears.forEach(year => {
        const yearData = getYearData(year)
        if (yearData?.locations) {
          allLocations.push(...yearData.locations)
        }
      })
      return allLocations
    }
  }, [selectedYear, availableYears, getYearData])

  // Stable flight animation callbacks
  const handleSegmentComplete = useCallback((location: TravelLocation) => {
    setActiveCityId(location.id)

    // Update current location index
    const locationIndex = locations.findIndex(loc => loc.id === location.id)
    if (locationIndex !== -1) {
      setCurrentLocationIndex(locationIndex)
    }

    // In manual mode, pause the journey at each location
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

    // Show album when flight segment completes
    const delay = progressionMode === 'manual' ? 500 : 1500
    setTimeout(() => {
      // Find albums and photos for this location
      const locationAlbums = location.albums || []
      const locationPhotos = location.photos || []

      if (locationAlbums.length > 0) {
        // Create a cluster for this location to show in the modal with unique ID
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

        // Show the album modal
        setSelectedCluster(cluster)
        setShowAlbumModal(true)

        log.debug('Showing album for completed flight segment', {
          component: 'EnhancedGlobe',
          action: 'show-album',
          locationId: location.id,
          albumCount: locationAlbums.length,
          photoCount: locationPhotos.length,
          progressionMode
        })
      }
    }, delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionMode, locations])

  // Animation complete callback (defined after locations)
  const handleAnimationComplete = useCallback(() => {
    // Focus on the final destination when animation completes
    if (locations.length > 0) {
      const finalDestination = locations[locations.length - 1]
      // Direct globe manipulation to avoid dependency issues
      if (globeRef.current) {
        const targetPOV = {
          lat: finalDestination.latitude,
          lng: finalDestination.longitude,
          altitude: 1.5
        }

        // Simple animation to final destination
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

  // Flight animation hook (defined after all callbacks)
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

    // Calculate center and span
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const latSpan = maxLat - minLat
    const lngSpan = maxLng - minLng
    const maxSpan = Math.max(latSpan, lngSpan)

    // Calculate appropriate altitude based on span
    let altitude = 2.5
    if (maxSpan < 5) altitude = 2.0
    else if (maxSpan < 15) altitude = 2.2
    else if (maxSpan < 30) altitude = 2.5
    else if (maxSpan < 60) altitude = 3.0
    else altitude = 3.5

    return {
      lat: centerLat,
      lng: centerLng,
      altitude
    }
  }, [])

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
  }, [interpolateLongitude])

  // UI control handlers
  const handleYearChange = useCallback((year: number) => {
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
  }, [setSelectedYear, setActiveCityId, setSelectedCluster, reset, getYearData, calculateOptimalCameraPosition, animateCameraToPosition])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
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
      animateCameraToPosition({ lat: 0, lng: 0, altitude: 2.5 }, 1500, 'easeInOutExpo')
    }
  }, [reset, setActiveCityId, setSelectedCluster, setIsAutoRotating, animateCameraToPosition])

  // Manual progression controls
  const advanceToNextLocation = useCallback(() => {
    if (currentLocationIndex >= locations.length - 1) {
      log.warn('Cannot advance - already at last location', {
        component: 'EnhancedGlobe',
        currentIndex: currentLocationIndex,
        totalLocations: locations.length
      })
      return
    }

    const nextIndex = currentLocationIndex + 1
    const nextLocation = locations[nextIndex]

    if (!nextLocation) {
      log.error('Next location not found', { nextIndex, totalLocations: locations.length })
      return
    }

    // Update the modal with the new location
    const locationAlbums = nextLocation.albums || []
    const locationPhotos = nextLocation.photos || []

    // Create a new cluster object with unique ID to force re-render
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

    // Use flushSync to ensure state updates complete immediately
    flushSync(() => {
      setCurrentLocationIndex(nextIndex)
      setIsJourneyPaused(false)
      setActiveCityId(nextLocation.id)
      setSelectedCluster(cluster)
      setShowAlbumModal(true)
    })

    // Animate camera to new location
    if (globeRef.current) {
      animateCameraToPosition({
        lat: nextLocation.latitude,
        lng: nextLocation.longitude,
        altitude: 1.5
      }, 1200, 'easeInOutCubic')
    }

    if (progressionMode === 'auto' && !isPlaying) {
      play()
    }

    log.info('Advanced to next location', {
      component: 'EnhancedGlobe',
      action: 'advance-next',
      nextIndex,
      locationName: nextLocation.name,
      photoCount: locationPhotos.length,
      albumCount: locationAlbums.length
    })
  }, [currentLocationIndex, locations, progressionMode, isPlaying, play, animateCameraToPosition, setShowAlbumModal])

  const goToPreviousLocation = useCallback(() => {
    if (currentLocationIndex <= 0) {
      log.warn('Cannot go back - already at first location', {
        component: 'EnhancedGlobe',
        currentIndex: currentLocationIndex
      })
      return
    }

    const prevIndex = currentLocationIndex - 1
    const prevLocation = locations[prevIndex]

    if (!prevLocation) {
      log.error('Previous location not found', { prevIndex, totalLocations: locations.length })
      return
    }

    // Update the modal with the previous location
    const locationAlbums = prevLocation.albums || []
    const locationPhotos = prevLocation.photos || []

    // Create a new cluster object with unique ID to force re-render
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

    // Use flushSync to ensure state updates complete immediately
    flushSync(() => {
      setCurrentLocationIndex(prevIndex)
      setIsJourneyPaused(false)
      setActiveCityId(prevLocation.id)
      setSelectedCluster(cluster)
      setShowAlbumModal(true)
    })

    // Animate camera to previous location
    if (globeRef.current) {
      animateCameraToPosition({
        lat: prevLocation.latitude,
        lng: prevLocation.longitude,
        altitude: 1.5
      }, 1200, 'easeInOutCubic')
    }

    if (progressionMode === 'auto' && !isPlaying) {
      play()
    }

    log.info('Moved to previous location', {
      component: 'EnhancedGlobe',
      action: 'goto-previous',
      prevIndex,
      locationName: prevLocation.name,
      photoCount: locationPhotos.length,
      albumCount: locationAlbums.length
    })
  }, [currentLocationIndex, locations, progressionMode, isPlaying, play, animateCameraToPosition, setShowAlbumModal])

  const resumeJourney = useCallback(() => {
    if (isJourneyPaused && progressionMode === 'manual') {
      setIsJourneyPaused(false)
      play()

      log.debug('Resumed journey from manual pause', {
        component: 'EnhancedGlobe',
        action: 'resume-journey',
        currentLocationIndex
      })
    }
  }, [isJourneyPaused, progressionMode, play, currentLocationIndex])

  const toggleProgressionMode = useCallback(() => {
    const newMode = progressionMode === 'auto' ? 'manual' : 'auto'
    setProgressionMode(newMode)

    // If switching to auto mode while paused, resume
    if (newMode === 'auto' && isJourneyPaused) {
      setIsJourneyPaused(false)
      if (!isPlaying && currentLocationIndex < locations.length - 1) {
        play()
      }
    }

    log.debug('Toggled progression mode', {
      component: 'EnhancedGlobe',
      action: 'toggle-progression-mode',
      newMode,
      wasJourneyPaused: isJourneyPaused
    })
  }, [progressionMode, isJourneyPaused, isPlaying, currentLocationIndex, locations, play])


  // Create chronological album timeline across all years
  const chronologicalAlbums = useMemo(() => {
    const allAlbums: Array<{
      albumId: string
      locationId: string
      locationName: string
      year: number
      visitDate: Date
      chronologicalIndex: number
      latitude: number
      longitude: number
      albumData: Album
      coverPhotoUrl?: string
      photoCount: number
    }> = []

    // Collect all albums from all years
    availableYears.forEach(year => {
      const yearData = getYearData(year)
      if (yearData && yearData.locations) {
        yearData.locations.forEach(location => {
          location.albums.forEach((album) => {
            allAlbums.push({
              albumId: album.id,
              locationId: location.id,
              locationName: location.name,
              year: year,
              visitDate: location.visitDate,
              chronologicalIndex: 0, // Will be set after sorting
              latitude: location.latitude,
              longitude: location.longitude,
              albumData: album,
              coverPhotoUrl: album.coverPhotoUrl,
              photoCount: album.photoCount || location.photos.length || 0
            })
          })
        })
      }
    })

    // Sort by visit date chronologically
    allAlbums.sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())

    // Set chronological indices
    allAlbums.forEach((album, index) => {
      album.chronologicalIndex = index
    })

    return allAlbums
  }, [availableYears, getYearData])

  // Get current album based on currentAlbumIndex
  const currentAlbum = chronologicalAlbums[currentAlbumIndex] || null

  // Album navigation functions
  const navigateToNextAlbum = useCallback(() => {
    if (currentAlbumIndex < chronologicalAlbums.length - 1) {
      const newIndex = currentAlbumIndex + 1
      const nextAlbum = chronologicalAlbums[newIndex]

      setCurrentAlbumIndex(newIndex)

      // Switch to the album's year if different
      if (nextAlbum.year !== selectedYear) {
        setSelectedYear(nextAlbum.year)
      }

      // Navigate to the album's location and show it
      setTimeout(() => {
        setActiveCityId(nextAlbum.locationId)
        if (globeRef.current) {
          animateCameraToPosition({
            lat: nextAlbum.latitude,
            lng: nextAlbum.longitude,
            altitude: 1.5
          }, 1200, 'easeInOutCubic')
        }

        // Show the album modal
        const cluster: CityCluster = {
          id: `album-${nextAlbum.albumId}`,
          latitude: nextAlbum.latitude,
          longitude: nextAlbum.longitude,
          cities: [{
            id: nextAlbum.locationId,
            name: nextAlbum.locationName,
            latitude: nextAlbum.latitude,
            longitude: nextAlbum.longitude,
            albumCount: 1,
            photoCount: nextAlbum.photoCount,
            visitDate: nextAlbum.visitDate.toISOString(),
            isVisited: true,
            isActive: true,
            favoritePhotoUrls: [],
            coverPhotoUrl: nextAlbum.coverPhotoUrl
          }],
          totalAlbums: 1,
          totalPhotos: nextAlbum.photoCount,
          radius: 1
        }

        setSelectedCluster(cluster)
        setShowAlbumModal(true)
      }, 100)
    }
  }, [currentAlbumIndex, chronologicalAlbums, selectedYear, setSelectedYear, animateCameraToPosition])

  const navigateToPreviousAlbum = useCallback(() => {
    if (currentAlbumIndex > 0) {
      const newIndex = currentAlbumIndex - 1
      const prevAlbum = chronologicalAlbums[newIndex]

      setCurrentAlbumIndex(newIndex)

      // Switch to the album's year if different
      if (prevAlbum.year !== selectedYear) {
        setSelectedYear(prevAlbum.year)
      }

      // Navigate to the album's location and show it
      setTimeout(() => {
        setActiveCityId(prevAlbum.locationId)
        if (globeRef.current) {
          animateCameraToPosition({
            lat: prevAlbum.latitude,
            lng: prevAlbum.longitude,
            altitude: 1.5
          }, 1200, 'easeInOutCubic')
        }

        // Show the album modal
        const cluster: CityCluster = {
          id: `album-${prevAlbum.albumId}`,
          latitude: prevAlbum.latitude,
          longitude: prevAlbum.longitude,
          cities: [{
            id: prevAlbum.locationId,
            name: prevAlbum.locationName,
            latitude: prevAlbum.latitude,
            longitude: prevAlbum.longitude,
            albumCount: 1,
            photoCount: prevAlbum.photoCount,
            visitDate: prevAlbum.visitDate.toISOString(),
            isVisited: true,
            isActive: true,
            favoritePhotoUrls: [],
            coverPhotoUrl: prevAlbum.coverPhotoUrl
          }],
          totalAlbums: 1,
          totalPhotos: prevAlbum.photoCount,
          radius: 1
        }

        setSelectedCluster(cluster)
        setShowAlbumModal(true)
      }, 100)
    }
  }, [currentAlbumIndex, chronologicalAlbums, selectedYear, setSelectedYear, animateCameraToPosition])

  const showCurrentAlbum = useCallback(() => {
    if (currentAlbum) {
      // Navigate to the current album's location and show it
      setActiveCityId(currentAlbum.locationId)

      // Switch to the album's year if different
      if (currentAlbum.year !== selectedYear) {
        setSelectedYear(currentAlbum.year)
      }

      if (globeRef.current) {
        animateCameraToPosition({
          lat: currentAlbum.latitude,
          lng: currentAlbum.longitude,
          altitude: 1.5
        }, 1200, 'easeInOutCubic')
      }

      // Show the album modal
      const cluster: CityCluster = {
        id: `album-${currentAlbum.albumId}`,
        latitude: currentAlbum.latitude,
        longitude: currentAlbum.longitude,
        cities: [{
          id: currentAlbum.locationId,
          name: currentAlbum.locationName,
          latitude: currentAlbum.latitude,
          longitude: currentAlbum.longitude,
          albumCount: 1,
          photoCount: currentAlbum.photoCount,
          visitDate: currentAlbum.visitDate.toISOString(),
          isVisited: true,
          isActive: true,
          favoritePhotoUrls: [],
          coverPhotoUrl: currentAlbum.coverPhotoUrl
        }],
        totalAlbums: 1,
        totalPhotos: currentAlbum.photoCount,
        radius: 1
      }

      setSelectedCluster(cluster)
      setShowAlbumModal(true)
    }
  }, [currentAlbum, selectedYear, setSelectedYear, animateCameraToPosition])

  // Stable references for keyboard shortcuts to prevent infinite loops
  const navigateToNextAlbumRef = useRef(navigateToNextAlbum)
  const navigateToPreviousAlbumRef = useRef(navigateToPreviousAlbum)
  const showCurrentAlbumRef = useRef(showCurrentAlbum)
  const currentAlbumRef = useRef(currentAlbum)
  const chronologicalAlbumsRef = useRef(chronologicalAlbums)

  // Update refs when functions change
  useEffect(() => {
    navigateToNextAlbumRef.current = navigateToNextAlbum
    navigateToPreviousAlbumRef.current = navigateToPreviousAlbum
    showCurrentAlbumRef.current = showCurrentAlbum
    currentAlbumRef.current = currentAlbum
    chronologicalAlbumsRef.current = chronologicalAlbums
  }, [navigateToNextAlbum, navigateToPreviousAlbum, showCurrentAlbum, currentAlbum, chronologicalAlbums])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault()
          if (locations.length > 1) {
            handlePlayPause()
          } else if (locations.length === 1) {
            // For single locations, open the album modal to show photos
            const location = locations[0]
            const locationPhotos = location.photos || []

            const cluster: CityCluster = {
              id: `single-${location.id}-${Date.now()}`,
              latitude: location.latitude,
              longitude: location.longitude,
              cities: [{
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                albumCount: location.albums.length,
                photoCount: locationPhotos.length,
                visitDate: location.visitDate.toISOString(),
                isVisited: true,
                isActive: true,
                favoritePhotoUrls: location.albums[0]?.favoritePhotoUrls || [],
                coverPhotoUrl: location.albums[0]?.coverPhotoUrl,
                previewPhotoUrls: locationPhotos.map(p => p.url).filter((url): url is string => !!url)
              }],
              totalAlbums: location.albums.length,
              totalPhotos: locationPhotos.length,
              radius: 1
            }
            setSelectedCluster(cluster)
            setShowAlbumModal(true)
          }
          break
        case 'r':
          event.preventDefault()
          handleReset()
          break
        case 's':
          event.preventDefault()
          setShowSearch(!showSearch)
          break
        case 'escape':
          event.preventDefault()
          setShowSearch(false)
          setShowAlbumModal(false)
          break
        case 'm':
          event.preventDefault()
          if (locations.length > 1) {
            toggleProgressionMode()
          }
          break
        case 'arrowleft':
          event.preventDefault()
          if (selectedYear && availableYears.length > 0) {
            const currentIndex = availableYears.indexOf(selectedYear)
            if (currentIndex > 0) {
              handleYearChange(availableYears[currentIndex - 1])
            }
          }
          break
        case 'arrowright':
          event.preventDefault()
          if (selectedYear && availableYears.length > 0) {
            const currentIndex = availableYears.indexOf(selectedYear)
            if (currentIndex < availableYears.length - 1) {
              handleYearChange(availableYears[currentIndex + 1])
            }
          }
          break
        case 'n':
          event.preventDefault()
          if (chronologicalAlbumsRef.current.length > 0) {
            navigateToNextAlbumRef.current()
          }
          break
        case 'p':
          event.preventDefault()
          if (chronologicalAlbumsRef.current.length > 0) {
            navigateToPreviousAlbumRef.current()
          }
          break
        case 'a':
          event.preventDefault()
          if (currentAlbumRef.current) {
            showCurrentAlbumRef.current()
          }
          break
        case 'm':
          event.preventDefault()
          if (locations.length > 1) {
            toggleProgressionMode()
          }
          break
        case 'arrowright':
        case '.':
          event.preventDefault()
          if (progressionMode === 'manual' && locations.length > 1) {
            advanceToNextLocation()
          }
          break
        case 'arrowleft':
        case ',':
          event.preventDefault()
          if (progressionMode === 'manual' && locations.length > 1) {
            goToPreviousLocation()
          }
          break
        case 'c':
          event.preventDefault()
          if (isJourneyPaused && progressionMode === 'manual') {
            resumeJourney()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [locations, showSearch, selectedYear, availableYears, handlePlayPause, handleReset, handleYearChange, progressionMode,
      isJourneyPaused, toggleProgressionMode, advanceToNextLocation, goToPreviousLocation, resumeJourney])


  // Prepare search data
  const searchData: GlobeSearchResult[] = useMemo(() => {
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      country: location.name, // Use the actual location name
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
    // Extract unique countries from location names (last part after comma)
    const uniqueCountries = new Set(
      locations
        .map(loc => {
          const parts = loc.name.split(',').map((p: string) => p.trim())
          return parts[parts.length - 1] || ''
        })
        .filter(country => country.length > 0)
    )

    // Extract unique cities from location names (first part before comma)
    const uniqueCities = new Set(
      locations
        .map(loc => {
          const parts = loc.name.split(',').map((p: string) => p.trim())
          return parts[0] || loc.name
        })
        .filter(city => city.length > 0)
    )

    const totalCountriesInWorld = 195 // UN recognized countries
    const totalMajorCitiesInWorld = 10000 // Approximate number of major cities worldwide

    return {
      countriesVisited: uniqueCountries.size,
      citiesVisited: uniqueCities.size,
      countriesPercentage: ((uniqueCountries.size / totalCountriesInWorld) * 100).toFixed(1),
      citiesPercentage: ((uniqueCities.size / totalMajorCitiesInWorld) * 100).toFixed(2)
    }
  }, [locations])

  // Dynamic color generation for any year
  const getYearColor = useCallback((year: number): string => {
    // Predefined color palette with vibrant colors
    const colorPalette = [
      '#60a5fa', // bright blue
      '#34d399', // bright green
      '#fbbf24', // bright amber
      '#f87171', // bright red
      '#a78bfa', // bright purple
      '#22d3ee', // bright cyan
      '#fb923c', // bright orange
      '#ec4899', // bright pink
      '#10b981', // emerald
      '#06b6d4', // sky
      '#8b5cf6', // violet
      '#f59e0b', // amber
      '#ef4444', // red
      '#14b8a6', // teal
      '#6366f1', // indigo
      '#f97316', // orange
    ]

    // Use year as seed for consistent color assignment
    // This ensures the same year always gets the same color
    const colorIndex = Math.abs(year) % colorPalette.length
    return colorPalette[colorIndex]
  }, [])

  // Convert locations to city pins - memoized to prevent unnecessary recalculations
  const cityPins: CityPin[] = useMemo(() => {
    return locations.map(location => {
      // Get favorite photos from the first album (since each location represents one album)
      const album = location.albums[0]
      const favoritePhotoUrls = album?.favoritePhotoUrls || []
      const coverPhotoUrl = album?.coverPhotoUrl

      // Fallback hierarchy: favorite photos > cover photo > first loaded photo
      const fallbackPhotoUrls = favoritePhotoUrls.length > 0
        ? favoritePhotoUrls
        : coverPhotoUrl
          ? [coverPhotoUrl]
          : location.photos.length > 0
            ? [location.photos[0].url]
            : []

      // Ensure coverPhotoUrl is set - use first available photo
      const finalCoverPhotoUrl = coverPhotoUrl ||
                                 (favoritePhotoUrls.length > 0 ? favoritePhotoUrls[0] : undefined) ||
                                 (location.photos.length > 0 ? location.photos[0].url : undefined)

      // Get preview photos for modal (first 5-8 photos from location)
      const previewPhotoUrls = location.photos.map(p => p.url).filter(url => url)

      const cityPin = {
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        albumCount: location.albums.length,
        // Use album's photoCount (actual count) not location.photos.length (only first 5 loaded)
        photoCount: album?.photoCount || location.photos.length,
        visitDate: location.visitDate.toISOString(),
        isVisited: true,
        isActive: activeCityId === location.id,
        favoritePhotoUrls: fallbackPhotoUrls,
        coverPhotoUrl: finalCoverPhotoUrl,
        previewPhotoUrls
      }

      return cityPin
    })
  }, [locations, activeCityId])

  // Static connection arcs - connect trips in chronological order
  const staticConnections = useMemo(() => {
    if (!showStaticConnections || locations.length < 2) return []

    // Sort locations by visit date
    const sortedLocations = [...locations].sort((a, b) =>
      new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
    )

    const paths: FlightPath[] = []

    // Create connection paths between consecutive locations
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const current = sortedLocations[i]
      const next = sortedLocations[i + 1]

      const currentYear = new Date(current.visitDate).getFullYear()
      const nextYear = new Date(next.visitDate).getFullYear()

      // If "All Years" is selected (selectedYear is null), connect ALL locations chronologically
      // If a specific year is selected, only connect locations within that year
      const shouldConnect = selectedYear === null || currentYear === nextYear

      if (shouldConnect) {
        // Use the current location's year for color (or next if crossing years)
        const lineYear = currentYear
        paths.push({
          startLat: current.latitude,
          startLng: current.longitude,
          endLat: next.latitude,
          endLng: next.longitude,
          color: getYearColor(lineYear),
          year: lineYear,
          name: `${current.name} → ${next.name}`,
        })
      }
    }

    return paths
  }, [locations, showStaticConnections, getYearColor, selectedYear])


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
  }, [cameraPosition, animateCameraToPosition])

  // Handle destination camera movement when flight segment completes
  useEffect(() => {
    if (destinationCameraPosition && globeRef.current && !isPlaying) {
      // Add a slight delay to ensure the flight animation has completed
      setTimeout(() => {
        animateCameraToPosition(destinationCameraPosition, 2500, 'easeInOutCubic')
      }, 500)
    }
  }, [destinationCameraPosition, isPlaying, animateCameraToPosition])

  // Auto-rotation functionality with smooth animation
  useEffect(() => {
    if (!globeRef.current || !isAutoRotating || userInteracting || isPlaying) {
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current as unknown as number)
        autoRotateRef.current = null
      }
      return
    }

    let lastTime = Date.now()
    const rotationSpeed = 0.1 // Degrees per frame (smooth and gentle)

    const animate = () => {
      if (globeRef.current && !userInteracting && isAutoRotating) {
        const currentTime = Date.now()
        const deltaTime = currentTime - lastTime
        lastTime = currentTime

        // Calculate smooth rotation based on time elapsed
        const rotationAmount = rotationSpeed * (deltaTime / 16.67) // Normalize to 60fps

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
  }, [isAutoRotating, userInteracting, isPlaying])

  // Cleanup on unmount
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
  }, [])

  // Handle initial navigation from feed button - only once
  useEffect(() => {
    // Skip if already handled or missing required data
    if (initialNavigationHandled.current || !globeReady || !initialAlbumId || !initialLat || !initialLng || chronologicalAlbums.length === 0) {
      return
    }

    // Find the album in chronological order
    const albumIndex = chronologicalAlbums.findIndex(album => album.albumId === initialAlbumId)
    if (albumIndex === -1) {
      return
    }

    // Mark as handled to prevent re-running
    initialNavigationHandled.current = true

    const album = chronologicalAlbums[albumIndex]

    // Set to "All Years" mode to show all albums
    setSelectedYear(null)

    // Set the current album index (for chronological navigation)
    setCurrentAlbumIndex(albumIndex)

    // Find the location index if needed for location-based features
    const locationIndex = locations.findIndex(loc => loc.id === initialAlbumId)
    if (locationIndex !== -1) {
      setCurrentLocationIndex(locationIndex)
    }

    // Disable auto-rotation
    setIsAutoRotating(false)

    // Animate to the location
    animateCameraToPosition({
      lat: initialLat,
      lng: initialLng,
      altitude: 1.5
    }, 2000, 'easeInOutCubic')

    // After camera animation, show the album modal with chronological positioning
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
    }, 2500)
  }, [globeReady, initialAlbumId, initialLat, initialLng, chronologicalAlbums, cityPins, animateCameraToPosition, locations, setSelectedYear])

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

    }
  }, [locations, animateCameraToPosition])



  function handleCityClick(city: CityPin) {
    setActiveCityId(city.id)
    setIsAutoRotating(false)

    // Create a single-city cluster for the modal with unique ID to force re-render
    const singleCityCluster: CityCluster = {
      id: `single-${city.id}-${Date.now()}`,
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


    if (globeRef.current) {
      animateCameraToPosition({
        lat: city.latitude,
        lng: city.longitude,
        altitude: 1.5
      }, 1200, 'easeInOutCubic')
    }
    // Don't auto-enable rotation - let user toggle it manually
  }

  function handleClusterClick(cluster: CityCluster) {
    setSelectedCluster(cluster)
    setShowAlbumModal(true)
    setIsAutoRotating(false)

    // Switch to manual mode when user clicks on a location
    if (progressionMode === 'auto') {
      setProgressionMode('manual')
      pause() // Pause the journey animation
      setIsJourneyPaused(true)
    }

    if (globeRef.current) {
      animateCameraToPosition({
        lat: cluster.latitude,
        lng: cluster.longitude,
        altitude: 1.2
      }, 1200, 'easeInOutCubic')
    }
    // Don't auto-enable rotation - let user toggle it manually
  }


  function zoomIn() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.max(0.5, pov.altitude * 0.8)
      animateCameraToPosition({ ...pov, altitude: newAltitude }, 400, 'easeInOutQuad')
      setIsAutoRotating(false)
      // Don't auto-enable rotation
    }
  }

  function zoomOut() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.min(5, pov.altitude * 1.2)
      animateCameraToPosition({ ...pov, altitude: newAltitude }, 400, 'easeInOutQuad')
      setIsAutoRotating(false)
      // Don't auto-enable rotation
    }
  }

  // Get current segment for timeline controls (currently unused)
  // const currentSegment = locations[progress.currentSegment] ? {
  //   id: locations[progress.currentSegment].id,
  //   year: locations[progress.currentSegment].visitDate.getFullYear(),
  //   sequenceOrder: progress.currentSegment + 1,
  //   cityId: undefined,
  //   countryId: undefined,
  //   visitDate: locations[progress.currentSegment].visitDate.toISOString().split('T')[0],
  //   latitude: locations[progress.currentSegment].latitude,
  //   longitude: locations[progress.currentSegment].longitude,
  //   albumCount: locations[progress.currentSegment].albums.length,
  //   photoCount: locations[progress.currentSegment].photos.length,
  //   locationName: locations[progress.currentSegment].name
  // } : null


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
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <GlobeIcon className="h-8 w-8" />
            Your Travel Globe
          </h1>
          <p className="text-white/90 text-sm">
            {locations.length > 0
              ? `Explore your ${locations.length} ${locations.length === 1 ? 'adventure' : 'adventures'} across the world`
              : 'Create your first album to see your travels on the globe'}
          </p>

          {/* Stats Grid */}
          {locations.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">{cityPinSystem.clusters.length}</div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">Location{cityPinSystem.clusters.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0)}
                </div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">Album{cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0) !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0)}
                </div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">Photo{cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0) !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">{availableYears.length}</div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">Year{availableYears.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">{travelStats.countriesPercentage}%</div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">{travelStats.countriesVisited} Countr{travelStats.countriesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-2xl font-bold">{travelStats.citiesPercentage}%</div>
                <div className="text-xs text-white/80 uppercase tracking-wider mt-1">{travelStats.citiesVisited} Cit{travelStats.citiesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Centered */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Link href="/albums/new">
          <Button size="sm" className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Adventure
          </Button>
        </Link>
      </div>

      {/* Globe Container with Floating Controls */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Floating Controls - Top */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 backdrop-blur-xl bg-gray-900/95 rounded-xl p-1.5 shadow-2xl border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className={cn("h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all", showSearch && 'bg-blue-500/30 text-blue-200')}
              title="Search locations (S)"
            >
              <Search className="h-4 w-4" />
            </Button>
            {locations.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayPause}
                disabled={locations.length < 2}
                className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all"
                id="play-button"
                title={isPlaying ? 'Pause animation (Space)' : 'Play animation (Space)'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStaticConnections(!showStaticConnections)}
              className={cn("h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all", showStaticConnections && 'bg-green-500/30 text-green-200')}
              title="Toggle travel routes"
            >
              <Route className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all"
              title="Reset view (R)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 backdrop-blur-xl bg-gray-900/95 rounded-xl p-1.5 shadow-2xl border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
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

      {/* Consolidated Timeline Controls */}
      {availableYears.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-700/50">
          <div className="space-y-6">
            {/* Year Selection */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-blue-500 to-purple-500"></div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Travel Timeline
                </h3>
                <div className="h-px w-12 bg-gradient-to-r from-purple-500 via-pink-500 to-transparent"></div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {/* All Years Button */}
                <button
                  onClick={() => setSelectedYear(null)}
                  className={cn(
                    "group relative px-6 py-3.5 rounded-2xl transition-all duration-300 min-w-[110px] overflow-hidden",
                    !selectedYear
                      ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-blue-500/30 scale-105 hover:shadow-xl hover:shadow-blue-500/40"
                      : "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-slate-500"
                  )}
                >
                  <div className="relative z-10">
                    <div className={cn(
                      "font-bold text-sm",
                      !selectedYear ? "text-white" : "text-slate-200"
                    )}>
                      All Years
                    </div>
                    <div className={cn(
                      "text-xs mt-1 font-medium",
                      !selectedYear ? "text-blue-50" : "text-slate-400"
                    )}>
                      {availableYears.reduce((total, year) => {
                        const yearData = getYearData(year)
                        return total + (yearData?.totalLocations || 0)
                      }, 0)} places
                    </div>
                  </div>
                  {!selectedYear && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                </button>

                {/* Individual Year Buttons */}
                {availableYears.map((year) => {
                  const yearData = getYearData(year)
                  const isSelected = selectedYear === year
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={cn(
                        "group relative px-6 py-3.5 rounded-2xl transition-all duration-300 min-w-[110px] overflow-hidden",
                        isSelected
                          ? "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 shadow-lg shadow-orange-500/30 scale-105 hover:shadow-xl hover:shadow-orange-500/40"
                          : "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-slate-500"
                      )}
                    >
                      <div className="relative z-10">
                        <div className={cn(
                          "font-bold text-sm",
                          isSelected ? "text-white" : "text-slate-200"
                        )}>
                          {year}
                        </div>
                        {yearData && (
                          <div className={cn(
                            "text-xs mt-1 font-medium",
                            isSelected ? "text-orange-50" : "text-slate-400"
                          )}>
                            {yearData.totalLocations} places
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Journey Progress - Only show if viewing single year with multiple locations */}
            {locations.length > 1 && selectedYear !== null && (
              <div className="space-y-3 pt-6 border-t border-slate-700/50">
                {/* Current Location Info */}
                {locations[currentLocationIndex] && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-600/50 shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                              <Plane className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Location {currentLocationIndex + 1} of {locations.length}
                            </span>
                          </div>
                          <div className="font-bold text-white text-lg leading-tight mb-1.5">
                            {locations[currentLocationIndex].name}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {locations[currentLocationIndex].visitDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className="relative">
                        <div className="w-full bg-slate-700/40 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/50"
                            style={{ width: `${((currentLocationIndex + 1) / locations.length) * 100}%` }}
                          >
                            <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent"></div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                          <span>Progress</span>
                          <span>{Math.round(((currentLocationIndex + 1) / locations.length) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* Globe */}
        <div className="rounded-2xl overflow-hidden relative flex items-center justify-center" style={{ height: windowDimensions.height }}>
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundColor="#0f1729"
                  width={windowDimensions.width}
                  height={windowDimensions.height}
                  showAtmosphere={performanceConfig.showAtmosphere}
                  atmosphereColor={`rgba(135, 206, 250, ${performanceConfig.atmosphereOpacity})`}
                  atmosphereAltitude={performanceConfig.atmosphereAltitude}

                  // Enhanced interaction handling - only for globe background clicks
                  onGlobeClick={(globalPoint, event) => {
                    // Only handle globe background clicks, not pin clicks
                    if (event && !(event.target as HTMLElement)?.closest('.globe-pin')) {
                      setUserInteracting(true)
                      setIsAutoRotating(false)
                      setTimeout(() => {
                        setUserInteracting(false)
                        // Don't auto-enable rotation
                      }, 2000)
                    }
                  }}

                  // Smooth controls
                  enablePointerInteraction={true}

                  // Performance optimizations
                  rendererConfig={{
                    antialias: false,
                    powerPreference: 'low-power'
                  }}

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
                    const pinSize = Math.max(data.size * 24, 50)

                    // Set up the container with proper event handling
                    el.style.cssText = `
                      position: relative;
                      width: ${pinSize}px;
                      height: ${pinSize}px;
                      cursor: pointer;
                      pointer-events: auto;
                      z-index: 10;
                      user-select: none;
                      -webkit-user-select: none;
                      -webkit-touch-callout: none;
                    `

                    // Get year from location data to determine color
                    const location = locations.find(loc =>
                      Math.abs(loc.latitude - data.lat) < 0.001 &&
                      Math.abs(loc.longitude - data.lng) < 0.001
                    )
                    const locationYear = location ? location.visitDate.getFullYear() : new Date().getFullYear()
                    const yearColor = getYearColor(locationYear)

                    // Simplified background color (no gradient for performance)
                    const pinColor = data.isActive ? '#ffa500' : yearColor

                    el.innerHTML = `
                      <div class="globe-pin" style="
                        width: 100%;
                        height: 100%;
                        background: ${pinColor};
                        border: ${data.isActive ? '3px' : '2px'} solid white;
                        border-radius: 50%;
                        opacity: ${data.opacity};
                        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                        cursor: pointer;
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        pointer-events: auto;
                        will-change: transform;
                      ">
                        <!-- Icon -->
                        <div style="
                          font-size: ${Math.max(pinSize * 0.35, 26)}px;
                          pointer-events: none;
                        ">📍</div>

                        ${data.isMultiCity ? `
                          <!-- Multi-city badge (simplified) -->
                          <div style="
                            position: absolute;
                            top: -6px;
                            right: -6px;
                            background: #f59e0b;
                            color: white;
                            border-radius: 50%;
                            width: ${Math.max(pinSize * 0.3, 20)}px;
                            height: ${Math.max(pinSize * 0.3, 20)}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${Math.max(pinSize * 0.16, 11)}px;
                            font-weight: 700;
                            border: 2px solid white;
                            pointer-events: none;
                          ">${data.cluster.cities.length}</div>
                        ` : ''}
                      </div>
                    `

                    // Targeted click handling - only prevent globe rotation, allow other page interactions
                    const handleClick = (event: Event) => {
                      // Only prevent default if this is actually a pin click
                      if (event.target && (event.target as HTMLElement).closest('.globe-pin')) {
                        event.preventDefault()
                        event.stopPropagation() // Only stop globe rotation, not all page interactions

                        // Ensure data has the cluster property for handlePinClick
                        const pinData = data as GlobeHtmlElement
                        if (pinData && pinData.cluster) {
                          cityPinSystem.handlePinClick(pinData)

                          log.debug('Pin clicked with cluster data', {
                            component: 'EnhancedGlobe',
                            action: 'pin-click',
                            clusterId: pinData.cluster.id,
                            cityCount: pinData.cluster.cities.length
                          })
                        } else {
                          // Fallback: handle as direct city click if no cluster
                          log.warn('Pin clicked but no cluster data available', {
                            component: 'EnhancedGlobe',
                            action: 'pin-click-fallback',
                            data: pinData
                          })

                          // Create a temporary cluster for single city
                          const city = cityPins.find(c =>
                            Math.abs(c.latitude - pinData.lat) < 0.001 &&
                            Math.abs(c.longitude - pinData.lng) < 0.001
                          )
                          if (city) {
                            handleCityClick(city)
                          }
                        }
                      }
                    }

                    // Add event listeners with standard event handling (no capture)
                    el.addEventListener('click', handleClick)
                    el.addEventListener('touchend', handleClick)

                    // Enhanced hover effects with photo preview
                    el.addEventListener('mouseenter', () => {
                      el.style.transform = 'scale(1.5)'
                      el.style.zIndex = '1000'
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        pinElement.style.transform = 'scale(1.1)'
                        pinElement.style.boxShadow = `
                          0 10px 40px rgba(0,0,0,0.4),
                          0 5px 20px ${data.isActive ? '#3b82f6aa' : `${yearColor}aa`},
                          inset 0 -3px 8px rgba(0,0,0,0.2),
                          inset 0 3px 8px rgba(255,255,255,0.5)
                        `
                        pinElement.style.borderWidth = '4px'
                      }

                      // Remove any existing tooltip first
                      const existingTooltip = el.querySelector('.photo-preview-tooltip')
                      if (existingTooltip) {
                        existingTooltip.remove()
                      }

                      // Add cleaner tooltip with album cover photo
                      const city = data.cluster.cities[0]
                      if (city && (city.coverPhotoUrl || city.favoritePhotoUrls?.length)) {
                        // Prioritize cover photo, then first favorite, then first available photo
                        const photoUrl = city.coverPhotoUrl || city.favoritePhotoUrls?.[0]
                        if (photoUrl) {
                          const tooltip = document.createElement('div')
                          tooltip.id = `tooltip-${data.cluster.id}`
                          tooltip.className = 'photo-preview-tooltip'
                          tooltip.innerHTML = `
                            <div style="
                              position: absolute;
                              bottom: ${pinSize + 15}px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: white;
                              border-radius: 16px;
                              padding: 6px;
                              box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                              border: 3px solid ${data.isActive ? '#3b82f6' : '#ef4444'};
                              z-index: 2000;
                              pointer-events: none;
                              opacity: 0;
                              transition: all 0.25s ease;
                            ">
                              <img src="${photoUrl}" alt="${city.name}" style="
                                width: 140px;
                                height: 90px;
                                object-fit: cover;
                                border-radius: 12px;
                                display: block;
                              " />
                              <div style="
                                text-align: center;
                                margin-top: 8px;
                                padding: 0 4px;
                                font-size: 12px;
                                font-weight: 700;
                                color: #1f2937;
                                max-width: 140px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                              ">${city.name}</div>
                              <div style="
                                text-align: center;
                                font-size: 11px;
                                color: #6b7280;
                                margin-top: 3px;
                                font-weight: 600;
                              ">${data.cluster.totalPhotos} photo${data.cluster.totalPhotos === 1 ? '' : 's'}</div>
                            </div>
                          `
                          el.appendChild(tooltip)

                          // Animate in
                          requestAnimationFrame(() => {
                            const tooltipElement = tooltip.querySelector('div') as HTMLElement
                            if (tooltipElement) {
                              tooltipElement.style.opacity = '1'
                              tooltipElement.style.transform = 'translateX(-50%) translateY(-8px)'
                            }
                          })
                        }
                      }
                    })

                    el.addEventListener('mouseleave', () => {
                      el.style.transform = 'scale(1)'
                      el.style.zIndex = '10'
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        pinElement.style.transform = 'scale(1)'
                        pinElement.style.boxShadow = `
                          0 6px 20px rgba(0,0,0,0.3),
                          0 3px 10px ${data.isActive ? '#3b82f688' : `${yearColor}88`},
                          inset 0 -2px 6px rgba(0,0,0,0.2),
                          inset 0 2px 6px rgba(255,255,255,0.4)
                        `
                        pinElement.style.borderWidth = data.isActive ? '4px' : '3px'
                      }

                      // Remove tooltip
                      const existingTooltip = el.querySelector('.photo-preview-tooltip')
                      if (existingTooltip) {
                        const tooltipElement = existingTooltip.querySelector('div') as HTMLElement
                        if (tooltipElement) {
                          tooltipElement.style.opacity = '0'
                          tooltipElement.style.transform = 'translateX(-50%) translateY(0)'
                          setTimeout(() => {
                            existingTooltip.remove()
                          }, 250)
                        }
                      }
                    })

                    // Add tooltip
                    el.title = formatPinTooltip(data.cluster)

                    return el
                  }}

                  // Animation rings disabled for performance
                  ringsData={[]}
                  ringLat={(d: object) => (d as { lat: number }).lat}
                  ringLng={(d: object) => (d as { lng: number }).lng}
                  ringMaxRadius={0}
                  ringPropagationSpeed={0}
                  ringRepeatPeriod={0}
                  ringColor={() => 'transparent'}

                  // Travel lines - elegant curved arcs showing journey progression
                  arcsData={performanceConfig.showArcs ? staticConnections : []}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={(d: object) => {
                    const path = d as FlightPath
                    // Vibrant, glowing colors with gradient-like appearance
                    return path.color + 'dd' // Higher opacity for visibility
                  }}
                  arcAltitude={0.25} // Lower, more natural arc curve
                  arcStroke={(d: object) => {
                    // Varied line thickness for depth
                    return performanceConfig.arcStroke * 1.2
                  }}
                  arcDashLength={0.3} // Shorter, more frequent dashes
                  arcDashGap={0.1} // Tighter gaps for continuity
                  arcDashAnimateTime={3000} // Slower, more graceful animation
                  arcDashInitialGap={(d: object) => {
                    // Stagger animation start times for wave effect
                    const path = d as FlightPath
                    return (path.year % 3) * 0.33 // Group by year for coordination
                  }}
                  arcCurveResolution={64} // Smoother curves (higher resolution)
                  arcCircularResolution={32} // Smoother tube geometry

                  onGlobeReady={() => {
                    setGlobeReady(true)

                    // Throttle rendering to 30 FPS for performance
                    if (globeRef.current) {
                      const globeMethods = globeRef.current as unknown as GlobeInternals
                      const scene = globeMethods.scene?.()
                      if (scene) {
                        const renderer = globeMethods.renderer?.()
                        if (renderer) {
                          const originalSetAnimationLoop = renderer.setAnimationLoop.bind(renderer)
                          let lastFrameTime = 0
                          const targetFPS = 30
                          const frameInterval = 1000 / targetFPS

                          renderer.setAnimationLoop = (callback: ((time: number) => void) | null) => {
                            if (!callback) {
                              originalSetAnimationLoop(null)
                              return
                            }
                            originalSetAnimationLoop((time: number) => {
                              if (time - lastFrameTime >= frameInterval) {
                                lastFrameTime = time
                                callback(time)
                              }
                            })
                          }
                        }
                      }
                    }

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
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
        </div>
      </div>




      {/* Additional Help */}
      {showSearch && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="bg-orange-900/80 text-white text-sm p-2">
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
}