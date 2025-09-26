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
  CheckCircle,
  Gauge,
  Keyboard,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Route,
  Clock,
  Camera
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
  const [showSpeedControls, setShowSpeedControls] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false)
  const [showOnboardingTour, setShowOnboardingTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const cameraAnimationRef = useRef<number | null>(null)



  const tourSteps = [
    {
      title: "Welcome to Your Travel Universe!",
      content: "This interactive globe shows all your travel memories. Let's explore the key features together.",
      target: "globe-container",
      position: "center"
    },
    {
      title: "Click on Pins",
      content: "Click any pin to view photos and details from that location. Hover to see photo previews!",
      target: "globe-container",
      position: "center"
    },
    {
      title: "Flight Animation",
      content: "Use the Play button to animate flights between your destinations and watch your journey unfold.",
      target: "play-button",
      position: "bottom"
    },
    {
      title: "Speed Controls",
      content: "Adjust animation speed from 0.25x to 4x using the speed controls or press 1-4 keys.",
      target: "speed-button",
      position: "bottom"
    },
    {
      title: "Timeline Scrubber",
      content: "Navigate through your journey manually using the timeline below the globe.",
      target: "timeline-scrubber",
      position: "top"
    },
    {
      title: "Travel Metrics",
      content: "View detailed statistics about your travels, including photos, locations, and yearly trends.",
      target: "metrics-button",
      position: "bottom"
    },
    {
      title: "Keyboard Shortcuts",
      content: "Press 'H' for keyboard shortcuts, 'S' for search, and 'ESC' to close panels. Happy exploring!",
      target: "shortcuts-button",
      position: "bottom"
    }
  ]

  const nextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1)
    } else {
      setShowOnboardingTour(false)
      setTourStep(0)
      localStorage.setItem('globe-tour-completed', 'true')
    }
  }

  const skipTour = () => {
    setShowOnboardingTour(false)
    setTourStep(0)
    localStorage.setItem('globe-tour-completed', 'true')
  }

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
    destinationCameraPosition,
    play,
    pause,
    reset,
    setLocations,
    setSpeed,
    speed,
    seekToSegment,
    seekToProgress
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

      // Auto-show album when flight segment completes
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

          log.debug('Auto-showing album for completed flight segment', {
            component: 'EnhancedGlobe',
            action: 'auto-show-album',
            locationId: location.id,
            albumCount: locationAlbums.length
          })
        }
      }, 1500) // Show album 1.5 seconds after segment completion
    },
    onAnimationComplete: () => {
      // Focus on the final destination when animation completes
      if (locations.length > 0) {
        const finalDestination = locations[locations.length - 1]
        animateCameraToPosition({
          lat: finalDestination.latitude,
          lng: finalDestination.longitude,
          altitude: 1.5
        }, 2000, 'easeInOutCubic')
        setActiveCityId(finalDestination.id)
      }
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
      albumData: any
      coverPhotoUrl?: string
      photoCount: number
    }> = []

    // Collect all albums from all years
    availableYears.forEach(year => {
      const yearData = getYearData(year)
      if (yearData && yearData.locations) {
        yearData.locations.forEach(location => {
          location.albums.forEach((album, albumIndex) => {
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
              photoCount: album.photos?.length || location.photos.length || 0
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
        case 'f':
          event.preventDefault()
          if (locations.length > 1) {
            setShowSpeedControls(!showSpeedControls)
          }
          break
        case 'h':
        case '?':
          event.preventDefault()
          setShowKeyboardHelp(!showKeyboardHelp)
          break
        case 'd':
          event.preventDefault()
          setShowDebugPanel(!showDebugPanel)
          break
        case 'escape':
          event.preventDefault()
          setShowSearch(false)
          setShowSpeedControls(false)
          setShowKeyboardHelp(false)
          setShowDebugPanel(false)
          setShowAlbumModal(false)
          setShowMetricsDashboard(false)
          setShowOnboardingTour(false)
          break
        case 'm':
          event.preventDefault()
          setShowMetricsDashboard(!showMetricsDashboard)
          break
        case '1':
        case '2':
        case '3':
        case '4':
          event.preventDefault()
          const speedMap = { '1': 0.5, '2': 1, '3': 2, '4': 4 }
          const newSpeed = speedMap[event.key as keyof typeof speedMap]
          if (newSpeed) {
            setSpeed(newSpeed)
            setShowSpeedControls(true)
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
          if (chronologicalAlbums.length > 0) {
            navigateToNextAlbum()
          }
          break
        case 'p':
          event.preventDefault()
          if (chronologicalAlbums.length > 0) {
            navigateToPreviousAlbum()
          }
          break
        case 'a':
          event.preventDefault()
          if (currentAlbum) {
            showCurrentAlbum()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [locations.length, showSearch, showSpeedControls, showKeyboardHelp, showDebugPanel, showMetricsDashboard,
      selectedYear, availableYears, setSpeed, handlePlayPause, handleReset, handleYearChange, chronologicalAlbums.length, navigateToNextAlbum, navigateToPreviousAlbum, currentAlbum, showCurrentAlbum])

  // Check if user should see onboarding tour (first time user or no data)
  useEffect(() => {
    if (!timelineLoading && locations.length === 0 && availableYears.length === 0) {
      // Show onboarding for users with no travel data
      setTimeout(() => setShowOnboardingTour(true), 2000)
    } else if (!timelineLoading && locations.length > 0 && !localStorage.getItem('globe-tour-completed')) {
      // Show onboarding for users with data who haven't seen the tour
      setTimeout(() => setShowOnboardingTour(true), 3000)
    }
  }, [timelineLoading, locations.length, availableYears.length])

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-6 text-white shadow-2xl">
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
            id="play-button"
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

          {/* Flight Speed Controls */}
          {(isPlaying || locations.length > 1) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpeedControls(!showSpeedControls)}
              className={cn(
                "text-sm",
                showSpeedControls ? 'bg-blue-50 border-blue-300' : ''
              )}
              id="speed-button"
            >
              <Gauge className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{speed}x</span>
            </Button>
          )}

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className={cn(
              "text-sm",
              showKeyboardHelp ? 'bg-blue-50 border-blue-300' : ''
            )}
            id="shortcuts-button"
          >
            <Keyboard className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetricsDashboard(!showMetricsDashboard)}
            className={cn(
              "text-sm",
              showMetricsDashboard ? 'bg-blue-50 border-blue-300' : ''
            )}
            id="metrics-button"
          >
            <BarChart3 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Metrics</span>
          </Button>
          <Link href="/albums/new">
            <Button size="sm" className="text-sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Adventure</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Flight Speed Controls Panel */}
      {showSpeedControls && (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Flight Animation Speed</h4>
              <Badge variant="outline">{speed}x Speed</Badge>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="0.25"
                max="4"
                step="0.25"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.25x</span>
                <span>1x</span>
                <span>2x</span>
                <span>4x</span>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpeed(0.5)}
                  className={speed === 0.5 ? 'bg-blue-50' : ''}
                >
                  Slow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpeed(1)}
                  className={speed === 1 ? 'bg-blue-50' : ''}
                >
                  Normal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpeed(2)}
                  className={speed === 2 ? 'bg-blue-50' : ''}
                >
                  Fast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpeed(4)}
                  className={speed === 4 ? 'bg-blue-50' : ''}
                >
                  Rapid
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Travel Metrics Dashboard */}
      {showMetricsDashboard && locations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Travel Metrics Dashboard
              </h4>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {selectedYear || 'All Years'}
              </Badge>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Locations</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{locations.length}</div>
                <div className="text-xs text-blue-600">
                  {new Set(locations.map(l => l.name.split(',').pop()?.trim())).size} countries
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Photos</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {locations.reduce((sum, loc) => sum + loc.photos.length, 0)}
                </div>
                <div className="text-xs text-green-600">
                  Avg {Math.round(locations.reduce((sum, loc) => sum + loc.photos.length, 0) / locations.length)} per location
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-2 mb-2">
                  <Route className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Albums</span>
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  {locations.reduce((sum, loc) => sum + loc.albums.length, 0)}
                </div>
                <div className="text-xs text-amber-600">
                  Avg {Math.round(locations.reduce((sum, loc) => sum + loc.albums.length, 0) / locations.length)} per location
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Time Span</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {(() => {
                    const dates = locations.map(l => l.visitDate).sort((a, b) => a.getTime() - b.getTime())
                    const years = Math.max(1, dates[dates.length - 1].getFullYear() - dates[0].getFullYear() + 1)
                    return years
                  })()}
                </div>
                <div className="text-xs text-orange-600">
                  {(() => {
                    const dates = locations.map(l => l.visitDate).sort((a, b) => a.getTime() - b.getTime())
                    return `${dates[0].getFullYear()} - ${dates[dates.length - 1].getFullYear()}`
                  })()}
                </div>
              </div>
            </div>

            {/* Travel Timeline Chart */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Travel Activity by Year
              </h5>
              <div className="space-y-2">
                {(() => {
                  const yearStats = availableYears.map(year => {
                    const yearData = getYearData(year)
                    return {
                      year,
                      locations: yearData?.totalLocations || 0,
                      photos: yearData?.totalPhotos || 0
                    }
                  })

                  const maxLocations = Math.max(...yearStats.map(y => y.locations))

                  return yearStats.map(stat => (
                    <div key={stat.year} className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-gray-700">{stat.year}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${maxLocations > 0 ? (stat.locations / maxLocations) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 w-20">
                            {stat.locations} locations
                          </div>
                          <div className="text-xs text-gray-500 w-20">
                            {stat.photos} photos
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Most Photographed Locations */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Most Photographed Locations
              </h5>
              <div className="space-y-2">
                {locations
                  .sort((a, b) => b.photos.length - a.photos.length)
                  .slice(0, 5)
                  .map((location, index) => (
                    <div key={location.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{location.name}</div>
                        <div className="text-xs text-gray-600">
                          {location.photos.length} photos • {location.albums.length} albums
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {location.visitDate.getFullYear()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetricsDashboard(false)}
              >
                Close Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Flight Timeline Scrubber */}
      {locations.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200" id="timeline-scrubber">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-stone-800 flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Timeline
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{Math.round(progress.overallProgress)}% Complete</span>
                {isPlaying && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Flying
                  </Badge>
                )}
              </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>

              {/* Interactive Scrubber */}
              <input
                type="range"
                min="0"
                max="100"
                value={progress.overallProgress}
                onChange={(e) => {
                  const newProgress = parseFloat(e.target.value)
                  seekToProgress(newProgress)
                }}
                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                disabled={isPlaying}
              />

              {/* Location markers */}
              <div className="absolute -top-1 left-0 right-0 h-4">
                {locations.map((location, index) => {
                  const position = (index / Math.max(locations.length - 1, 1)) * 100
                  const isActive = index === progress.currentSegment
                  return (
                    <div
                      key={location.id}
                      className={cn(
                        "absolute w-4 h-4 rounded-full border-2 border-white cursor-pointer transition-all duration-200 transform -translate-x-2 hover:scale-125",
                        isActive
                          ? "bg-orange-500 shadow-lg z-20"
                          : "bg-blue-500 hover:bg-blue-600 z-10"
                      )}
                      style={{ left: `${position}%` }}
                      onClick={() => seekToSegment(index)}
                      title={`${location.name} (${location.visitDate.getFullYear()})`}
                    />
                  )
                })}
              </div>

              {/* Album markers */}
              <div className="absolute top-5 left-0 right-0 h-8">
                {chronologicalAlbums.map((album, index) => {
                  // Find the position based on visit date relative to the timeline
                  const earliestDate = locations[0]?.visitDate.getTime() || Date.now()
                  const latestDate = locations[locations.length - 1]?.visitDate.getTime() || Date.now()
                  const albumDate = album.visitDate.getTime()
                  const timelineRange = latestDate - earliestDate
                  const position = timelineRange > 0
                    ? ((albumDate - earliestDate) / timelineRange) * 100
                    : index / Math.max(chronologicalAlbums.length - 1, 1) * 100

                  const isCurrentAlbum = index === currentAlbumIndex
                  const albumLocation = locations.find(loc => loc.id === album.locationId)
                  const isActiveLocation = albumLocation && locations.findIndex(loc => loc.id === albumLocation.id) === progress.currentSegment

                  return (
                    <div key={`album-${album.albumId}`} className="relative group">
                      <div
                        className={cn(
                          "absolute w-2 h-2 rounded-full cursor-pointer transition-all duration-200 transform -translate-x-1 hover:scale-150",
                          isCurrentAlbum
                            ? "bg-yellow-500 shadow-md z-30 ring-2 ring-yellow-300"
                            : isActiveLocation
                            ? "bg-green-500 shadow-sm z-25"
                            : "bg-yellow-400 hover:bg-yellow-500 z-15"
                        )}
                        style={{ left: `${Math.min(Math.max(position, 1), 99)}%` }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentAlbumIndex(index)
                          showCurrentAlbum()
                        }}
                        title={`${album.locationName} Album (${new Date(album.visitDate).toLocaleDateString()})`}
                      />

                      {/* Album tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-orange-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                           style={{ left: `${Math.min(Math.max(position, 1), 99)}%` }}>
                        <div className="font-semibold">{album.locationName}</div>
                        <div>{new Date(album.visitDate).toLocaleDateString()}</div>
                        <div>{album.photoCount} photos</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-orange-800"></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Album markers legend */}
              {chronologicalAlbums.length > 0 && (
                <div className="absolute top-14 left-0 right-0">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span>Albums</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Current Album</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Active Location Album</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Segment Info */}
            {progress.currentLocation && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{progress.currentLocation.name}</p>
                    <p className="text-sm text-gray-600">
                      {progress.currentLocation.visitDate.toLocaleDateString()} •
                      Segment {progress.currentSegment + 1} of {progress.totalSegments}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seekToSegment(Math.max(0, progress.currentSegment - 1))}
                      disabled={progress.currentSegment === 0 || isPlaying}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seekToSegment(Math.min(locations.length - 1, progress.currentSegment + 1))}
                      disabled={progress.currentSegment >= locations.length - 1 || isPlaying}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekToSegment(0)}
                disabled={isPlaying}
              >
                ⏮ Start
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={locations.length < 2}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekToSegment(locations.length - 1)}
                disabled={isPlaying}
              >
                ⏭ End
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Album Navigation Controls */}
      {chronologicalAlbums.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Album Navigation
              </h3>
              <Badge variant="secondary" className="text-xs">
                {currentAlbumIndex + 1} of {chronologicalAlbums.length}
              </Badge>
            </div>

            {currentAlbum && (
              <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-700">
                <div className="font-medium">{currentAlbum.locationName}</div>
                <div className="text-stone-600 mt-1">
                  {new Date(currentAlbum.visitDate).toLocaleDateString()} • {currentAlbum.year}
                </div>
                <div className="text-stone-600">
                  {currentAlbum.photoCount} photos
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToPreviousAlbum}
                disabled={currentAlbumIndex === 0}
                className="flex items-center gap-2"
              >
                ← Previous Album
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={showCurrentAlbum}
                disabled={!currentAlbum}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Show Album
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToNextAlbum}
                disabled={currentAlbumIndex === chronologicalAlbums.length - 1}
                className="flex items-center gap-2"
              >
                Next Album →
              </Button>
            </div>
          </div>
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
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Travel Timeline</h3>
            <p className="text-sm text-stone-600">Select a year to explore your adventures</p>
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
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 border-rose-500 text-white shadow-lg transform scale-105"
                      : "bg-white border-gray-200 text-gray-700 hover:border-rose-300 hover:shadow-md hover:scale-102"
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
                      ? "bg-gradient-to-r from-rose-400/20 to-amber-500/20 opacity-100"
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
                <div className="text-sm text-stone-600">
                  Exploring <span className="font-semibold text-stone-800">{selectedYear}</span> •
                  <span className="text-blue-600 font-medium"> {currentYearData.totalLocations} destinations</span> •
                  <span className="text-rose-600 font-medium"> {currentYearData.totalPhotos} memories</span>
                </div>
              </div>
            </div>
          )}
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
                    const pinSize = Math.max(data.size * 32, 80)

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
                        const pinData = data as any
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

      {/* Keyboard Shortcuts Help Panel */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-orange-900/30 flex items-center justify-center z-50">
          <Card className="bg-white max-w-md w-full mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Keyboard Shortcuts
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeyboardHelp(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">Space</kbd>
                  <span>Play/Pause flight animation</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">R</kbd>
                  <span>Reset view and animation</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">S</kbd>
                  <span>Toggle search</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">F</kbd>
                  <span>Toggle speed controls</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">1-4</kbd>
                  <span>Set animation speed (0.5x-4x)</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">←/→</kbd>
                  <span>Navigate between years</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">M</kbd>
                  <span>Toggle metrics dashboard</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">D</kbd>
                  <span>Toggle debug panel</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">ESC</kbd>
                  <span>Close all panels</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">N</kbd>
                  <span>Next album</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">P</kbd>
                  <span>Previous album</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">A</kbd>
                  <span>Show current album</span>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-center font-mono text-xs">H/?</kbd>
                  <span>Show this help panel</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Tip: Hover over pins to see photo previews!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
      />

      {/* Onboarding Tour */}
      {showOnboardingTour && (
        <div className="fixed inset-0 bg-orange-900/30 z-[60] flex items-center justify-center">
          <Card className="bg-white max-w-lg w-full mx-4 relative">
            <CardContent className="p-6">
              <div className="absolute top-2 right-2 text-xs text-gray-500">
                {tourStep + 1} of {tourSteps.length}
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {tourSteps[tourStep]?.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {tourSteps[tourStep]?.content}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-200",
                        index <= tourStep ? "bg-blue-500" : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                  className="text-gray-500"
                >
                  Skip Tour
                </Button>
                <div className="flex gap-2">
                  {tourStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTourStep(tourStep - 1)}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={nextTourStep}
                  >
                    {tourStep === tourSteps.length - 1 ? 'Get Started!' : 'Next'}
                  </Button>
                </div>
              </div>

              {/* Help text */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  💡 You can press &apos;H&apos; anytime for keyboard shortcuts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}