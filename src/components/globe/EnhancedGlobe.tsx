'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Globe as GlobeIcon,
  MapPin,
  Plus,
  Loader2,
  RotateCcw,
  Play,
  Pause,
  Plane,
  Route,
  SkipForward,
  SkipBack,
  Settings,
  Search,
  Gauge,
  ZoomIn,
  ZoomOut,
  Star
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
  const [windowDimensions, setWindowDimensions] = useState({ width: 800, height: 500 })
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0)
  const [showStaticConnections, setShowStaticConnections] = useState(true)
  const [progressionMode, setProgressionMode] = useState<'auto' | 'manual'>('auto')
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0)
  const [isJourneyPaused, setIsJourneyPaused] = useState(false)
  const [showSpeedControls, setShowSpeedControls] = useState(false)
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

  // Get current year data
  const currentYearData = selectedYear ? getYearData(selectedYear) : null
  const locations = useMemo(() => currentYearData?.locations || [], [currentYearData])

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
      // Find albums for this location
      const locationAlbums = location.albums || []
      if (locationAlbums.length > 0) {
        // Create a cluster for this location to show in the modal
        const cluster: CityCluster = {
          id: `location-${location.id}`,
          latitude: location.latitude,
          longitude: location.longitude,
          cities: [{
            id: location.id,
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            albumCount: locationAlbums.length,
            photoCount: location.photos?.length || 0,
            visitDate: location.visitDate.toISOString(),
            isVisited: true,
            isActive: true,
            favoritePhotoUrls: locationAlbums.flatMap(album => album.favoritePhotoUrls || []).slice(0, 3),
            coverPhotoUrl: locationAlbums[0]?.coverPhotoUrl
          }],
          totalAlbums: locationAlbums.length,
          totalPhotos: location.photos?.length || 0,
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
          progressionMode
        })
      }
    }, delay)
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
    progress,
    cameraPosition,
    destinationCameraPosition,
    play,
    pause,
    reset,
    setLocations,
    speed,
    seekToSegment
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
    if (currentLocationIndex < locations.length - 1) {
      const nextIndex = currentLocationIndex + 1
      setCurrentLocationIndex(nextIndex)
      setIsJourneyPaused(false)

      // Jump directly to the next location or resume flight
      seekToSegment(nextIndex)

      if (progressionMode === 'auto' && !isPlaying) {
        play()
      }

      log.debug('Advanced to next location', {
        component: 'EnhancedGlobe',
        action: 'advance-next',
        nextIndex,
        locationName: locations[nextIndex]?.name
      })
    }
  }, [currentLocationIndex, locations, seekToSegment, progressionMode, isPlaying, play])

  const goToPreviousLocation = useCallback(() => {
    if (currentLocationIndex > 0) {
      const prevIndex = currentLocationIndex - 1
      setCurrentLocationIndex(prevIndex)
      setIsJourneyPaused(false)

      // Jump directly to the previous location
      seekToSegment(prevIndex)

      if (progressionMode === 'auto' && !isPlaying) {
        play()
      }

      log.debug('Moved to previous location', {
        component: 'EnhancedGlobe',
        action: 'goto-previous',
        prevIndex,
        locationName: locations[prevIndex]?.name
      })
    }
  }, [currentLocationIndex, locations, seekToSegment, progressionMode, isPlaying, play])

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
            const cluster: CityCluster = {
              id: `single-${location.id}`,
              latitude: location.latitude,
              longitude: location.longitude,
              cities: [{
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                albumCount: location.albums.length,
                photoCount: location.photos.length,
                visitDate: location.visitDate.toISOString(),
                isVisited: true,
                isActive: true,
                favoritePhotoUrls: location.albums[0]?.favoritePhotoUrls || [],
                coverPhotoUrl: location.albums[0]?.coverPhotoUrl
              }],
              totalAlbums: location.albums.length,
              totalPhotos: location.photos.length,
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
  }, [locations.length, showSearch, selectedYear, availableYears, handlePlayPause, handleReset, handleYearChange, progressionMode,
      isJourneyPaused, toggleProgressionMode, advanceToNextLocation, goToPreviousLocation, resumeJourney])


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

  // Static connection arcs - connect trips in chronological order by year
  const staticConnections = useMemo(() => {
    if (!showStaticConnections || locations.length < 2) return []

    // Sort locations by visit date
    const sortedLocations = [...locations].sort((a, b) =>
      new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
    )

    const paths: FlightPath[] = []
    const yearColors: { [key: number]: string } = {
      2023: '#3b82f6', // blue
      2024: '#10b981', // green
      2025: '#f59e0b', // amber
      2026: '#ef4444', // red
      2027: '#8b5cf6', // purple
      2028: '#06b6d4', // cyan
      2029: '#f97316', // orange
    }

    // Create connection paths between consecutive locations in the same year
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const current = sortedLocations[i]
      const next = sortedLocations[i + 1]

      const currentYear = new Date(current.visitDate).getFullYear()
      const nextYear = new Date(next.visitDate).getFullYear()

      // Only connect trips in the same year
      if (currentYear === nextYear) {
        paths.push({
          startLat: current.latitude,
          startLng: current.longitude,
          endLat: next.latitude,
          endLng: next.longitude,
          color: yearColors[currentYear] || '#6b7280', // default gray
          year: currentYear,
          name: `${current.name} → ${next.name}`,
        })
      }
    }

    return paths
  }, [locations, showStaticConnections])


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
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-4 sm:p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="text-center sm:text-left space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <GlobeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
                Your Travel Universe
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto sm:mx-0">
                Explore your adventures across the globe with interactive pins, flight paths, and beautiful memories.
              </p>
            </div>

            {/* Travel Statistics */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{cityPinSystem.clusters.length}</div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Locations</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0)}
                </div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Albums</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0)}
                </div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Photos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{availableYears.length}</div>
                <div className="text-xs text-blue-200 uppercase tracking-wider">Years</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single Location Welcome Message */}
      {locations.length === 1 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                🎯 Your Adventure Begins Here!
              </h3>
              <p className="text-green-700 text-sm mb-3">
                You&apos;ve captured memories at <strong>{locations[0]?.name}</strong>. This special location is highlighted with a golden pulse ring and special indicators.
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-green-700 border border-green-200">
                  📸 {locations[0]?.photos.length} Photo{locations[0]?.photos.length !== 1 ? 's' : ''}
                </div>
                <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-green-700 border border-green-200">
                  📚 {locations[0]?.albums.length} Album{locations[0]?.albums.length !== 1 ? 's' : ''}
                </div>
                <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-green-700 border border-green-200">
                  ⌨️ Press Spacebar to view
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border border-gray-200">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "text-sm min-h-10 px-3 sm:px-4",
              showSearch ? 'bg-blue-50 border-blue-300' : ''
            )}
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="min-h-10 px-3 sm:px-4"
          >
            <RotateCcw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStaticConnections(!showStaticConnections)}
            className={cn(
              "text-sm min-h-10 px-3 sm:px-4 col-span-2 sm:col-span-1",
              showStaticConnections ? 'bg-green-50 border-green-300' : ''
            )}
          >
            <Route className="h-4 w-4 sm:mr-2" />
            <span className="inline sm:hidden">
              {showStaticConnections ? 'Hide Routes' : 'Show Routes'}
            </span>
            <span className="hidden sm:inline">
              {showStaticConnections ? 'Hide' : 'Show'} Routes
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={locations.length < 2}
            className="text-sm min-h-10 px-3 sm:px-4 col-span-2 sm:col-span-1"
            id="play-button"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 sm:mr-2" />
            ) : (
              <Play className="h-4 w-4 sm:mr-2" />
            )}
            <span className="inline sm:hidden">
              {isPlaying ? 'Pause' : 'Play'}
            </span>
            <span className="hidden sm:inline">
              {isPlaying ? 'Pause' : 'Play'} Flight
            </span>
          </Button>

          {/* Flight Speed Controls */}
          {(isPlaying || locations.length > 1) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpeedControls(!showSpeedControls)}
              className={cn(
                "text-sm min-h-10 px-3 sm:px-4",
                showSpeedControls ? 'bg-blue-50 border-blue-300' : ''
              )}
              id="speed-button"
            >
              <Gauge className="h-4 w-4 sm:mr-2" />
              <span className="inline">{speed}x</span>
            </Button>
          )}

          {/* Progression Mode Toggle */}
          {locations.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleProgressionMode}
              className={cn(
                "text-sm min-h-10 px-3 sm:px-4",
                progressionMode === 'manual' ? 'bg-purple-50 border-purple-300' : 'bg-amber-50 border-amber-300'
              )}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="inline sm:hidden">
                {progressionMode === 'auto' ? 'Auto' : 'Manual'}
              </span>
              <span className="hidden sm:inline">
                {progressionMode === 'auto' ? 'Auto' : 'Manual'}
              </span>
            </Button>
          )}

          {/* Manual Progression Controls */}
          {progressionMode === 'manual' && locations.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousLocation}
                disabled={currentLocationIndex === 0}
                className="text-sm min-h-10 px-3 sm:px-4"
              >
                <SkipBack className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              {isJourneyPaused && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resumeJourney}
                  className="text-sm min-h-10 px-3 sm:px-4 bg-green-50 border-green-300"
                >
                  <Play className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Continue</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={advanceToNextLocation}
                disabled={currentLocationIndex >= locations.length - 1}
                className="text-sm min-h-10 px-3 sm:px-4"
              >
                <SkipForward className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Next</span>
              </Button>
            </>
          )}

          <Link href="/albums/new" className="col-span-2 sm:col-span-1">
            <Button size="sm" className="text-sm min-h-10 px-3 sm:px-4 w-full">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="inline">Add Adventure</span>
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

      {/* Consolidated Timeline Controls */}
      {availableYears.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="space-y-4">
            {/* Year Selection */}
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Travel Timeline</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {availableYears.map((year) => {
                  const yearData = getYearData(year)
                  const isSelected = selectedYear === year
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={cn(
                        "px-4 py-2 rounded-lg transition-all duration-200 min-w-[80px] text-sm",
                        isSelected
                          ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      <div className="font-semibold">{year}</div>
                      {yearData && (
                        <div className={cn(
                          "text-xs mt-1",
                          isSelected ? "text-blue-100" : "text-gray-500"
                        )}>
                          {yearData.totalLocations} places
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Journey Progress */}
            {locations.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Journey Progress
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {currentLocationIndex + 1} of {locations.length}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentLocationIndex + 1) / locations.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Location markers */}
                  <div className="absolute top-0 left-0 w-full h-2 flex justify-between">
                    {locations.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-3 h-3 rounded-full border-2 bg-white transform -translate-y-0.5 cursor-pointer transition-all",
                          index <= currentLocationIndex
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 hover:border-gray-400"
                        )}
                        onClick={() => {
                          setCurrentLocationIndex(index)
                          seekToSegment(index)
                        }}
                        title={locations[index]?.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Current Location Info */}
                {locations[currentLocationIndex] && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {locations[currentLocationIndex].name}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {locations[currentLocationIndex].visitDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Globe */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 xl:flex-[2]">
          <div className="globe-container bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-500 h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden relative flex items-center justify-center" id="globe-container">
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

                  // Enhanced interaction handling - only for globe background clicks
                  onGlobeClick={(globalPoint, event) => {
                    // Only handle globe background clicks, not pin clicks
                    if (event && !(event.target as HTMLElement)?.closest('.globe-pin')) {
                      setUserInteracting(true)
                      setIsAutoRotating(false)
                      setTimeout(() => {
                        setUserInteracting(false)
                        setIsAutoRotating(true)
                      }, 3000)
                    }
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

                    el.innerHTML = `
                      <div class="globe-pin" style="
                        width: 100%;
                        height: 100%;
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
                        pointer-events: auto;
                      ">
                        <div style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          font-size: ${Math.max(pinSize * 0.3, 24)}px;
                          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
                          z-index: 2;
                          pointer-events: none;
                        ">${hasPhotos ? '📸' : (data.isMultiCity ? '🏛️' : '📍')}</div>

                        ${locations.length === 1 && !data.isMultiCity ? `
                          <!-- Single location special indicators -->
                          <div style="
                            position: absolute;
                            top: -8px;
                            left: -8px;
                            right: -8px;
                            bottom: -8px;
                            border: 2px solid #ffd700;
                            border-radius: 50%;
                            animation: pulse-ring 2s infinite;
                            pointer-events: none;
                          "></div>
                          <div style="
                            position: absolute;
                            bottom: -4px;
                            right: -4px;
                            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                            color: white;
                            border-radius: 50%;
                            width: ${Math.max(pinSize * 0.2, 16)}px;
                            height: ${Math.max(pinSize * 0.2, 16)}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${Math.max(pinSize * 0.1, 10)}px;
                            font-weight: bold;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            z-index: 3;
                            pointer-events: none;
                          ">✨</div>
                          <div style="
                            position: absolute;
                            top: -20px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(0,0,0,0.8);
                            color: white;
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 500;
                            white-space: nowrap;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                            pointer-events: none;
                            z-index: 4;
                          " class="single-location-tooltip">
                            🎯 Your Only Adventure
                          </div>
                        ` : ''}
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
                      el.style.transform = 'scale(1.6)'
                      el.style.zIndex = '1000'
                      el.style.filter = `brightness(1.2) drop-shadow(0 8px 24px ${data.color}66)`
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        pinElement.style.boxShadow = `
                          0 8px 32px rgba(0,0,0,0.5),
                          0 4px 16px ${data.color}88,
                          0 0 0 4px rgba(255,255,255,0.3),
                          inset 0 2px 4px rgba(255,255,255,0.4)
                        `
                        pinElement.style.borderWidth = '4px'
                      }

                      // Add photo preview tooltip
                      const city = data.cluster.cities[0]
                      if (city && (city.favoritePhotoUrls?.length || city.coverPhotoUrl)) {
                        const photoUrl = city.favoritePhotoUrls?.[0] || city.coverPhotoUrl
                        if (photoUrl) {
                          const tooltip = document.createElement('div')
                          tooltip.id = `tooltip-${data.cluster.id}`
                          tooltip.className = 'photo-preview-tooltip'
                          tooltip.innerHTML = `
                            <div style="
                              position: absolute;
                              top: -120px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: white;
                              border-radius: 12px;
                              padding: 8px;
                              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                              border: 2px solid ${data.color};
                              z-index: 2000;
                              pointer-events: none;
                              opacity: 0;
                              transition: opacity 0.3s ease;
                            ">
                              <img src="${photoUrl}" style="
                                width: 120px;
                                height: 80px;
                                object-fit: cover;
                                border-radius: 8px;
                                display: block;
                              " />
                              <div style="
                                text-align: center;
                                margin-top: 6px;
                                font-size: 11px;
                                font-weight: 600;
                                color: #374151;
                                max-width: 120px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                              ">${city.name}</div>
                              <div style="
                                text-align: center;
                                font-size: 10px;
                                color: #6b7280;
                                margin-top: 2px;
                              ">${data.cluster.totalPhotos} photo${data.cluster.totalPhotos === 1 ? '' : 's'}</div>
                            </div>
                          `
                          el.appendChild(tooltip)

                          // Animate in
                          setTimeout(() => {
                            const tooltipElement = tooltip.querySelector('div') as HTMLElement
                            if (tooltipElement) {
                              tooltipElement.style.opacity = '1'
                            }
                          }, 150)
                        }
                      }
                    })

                    el.addEventListener('mouseleave', () => {
                      el.style.transform = 'scale(1)'
                      el.style.zIndex = '10'
                      el.style.filter = 'none'
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        pinElement.style.boxShadow = `
                          0 4px 16px rgba(0,0,0,0.4),
                          0 2px 8px ${data.color}44,
                          inset 0 2px 4px rgba(255,255,255,0.3)
                        `
                        pinElement.style.borderWidth = '3px'
                      }

                      // Remove photo preview tooltip
                      const existingTooltip = el.querySelector('.photo-preview-tooltip')
                      if (existingTooltip) {
                        const tooltipElement = existingTooltip.querySelector('div') as HTMLElement
                        if (tooltipElement) {
                          tooltipElement.style.opacity = '0'
                          setTimeout(() => {
                            existingTooltip.remove()
                          }, 300)
                        }
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
                  labelColor={(d: object) => (d as { color?: string }).color || '#ffffff'}
                  labelDotRadius={0.5}
                  labelIncludeDot={true}

                  // Animation rings for active cities
                  ringsData={cityPinSystem.ringData}
                  ringLat={(d: object) => (d as { lat: number }).lat}
                  ringLng={(d: object) => (d as { lng: number }).lng}
                  ringMaxRadius={(d: object) => (d as { maxR: number }).maxR}
                  ringPropagationSpeed={(d: object) => (d as { propagationSpeed: number }).propagationSpeed}
                  ringRepeatPeriod={(d: object) => (d as { repeatPeriod: number }).repeatPeriod}
                  ringColor={(d: object) => (d as { color?: string }).color || '#ff6b35'}

                  // Static connection arcs
                  arcsData={staticConnections}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={(d: object) => (d as FlightPath).color}
                  arcAltitude={0.3}
                  arcStroke={3}
                  arcDashLength={0.9}
                  arcDashGap={0.1}
                  arcDashInitialGap={() => Math.random()}
                  arcDashAnimateTime={4000}

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
            <CardContent className="p-4 sm:p-6">
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
              <div className="space-y-2 sm:space-y-3">
                <div className="text-sm font-medium text-gray-900 mb-3">Quick Actions</div>
                <Link href="/albums/new">
                  <Button className="w-full justify-start text-sm min-h-10 touch-manipulation">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Adventure
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="default"
                  className="w-full justify-start text-sm min-h-10 touch-manipulation"
                  onClick={() => setActiveCityId(null)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="w-full justify-start text-sm min-h-10 touch-manipulation"
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
        showProgressionControls={locations.length > 1}
        currentLocationIndex={currentLocationIndex}
        totalLocations={locations.length}
        progressionMode={progressionMode}
        onNextLocation={advanceToNextLocation}
        onPreviousLocation={goToPreviousLocation}
        onContinueJourney={resumeJourney}
        canGoNext={currentLocationIndex < locations.length - 1}
        canGoPrevious={currentLocationIndex > 0}
      />

    </div>
  )
}