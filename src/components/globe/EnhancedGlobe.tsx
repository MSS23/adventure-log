'use client'

import { useRef, useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle, useId } from 'react'
import { flushSync } from 'react-dom'
import dynamic from 'next/dynamic'
import type { GlobeMethods } from 'react-globe.gl'
import { useTravelTimeline, type TravelLocation, type Album } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation'
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
  ZoomOut,
  MapPin as LocationIcon,
  Navigation
} from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { escapeHtml, escapeAttr } from '@/lib/utils/html-escape'

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

interface OrbitControls {
  enabled: boolean
  update?: () => void
}

interface EnhancedGlobeProps {
  className?: string
  initialAlbumId?: string
  initialLat?: number
  initialLng?: number
  filterUserId?: string
  hideHeader?: boolean // Hide the header when embedded in profile pages
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
}

export const EnhancedGlobe = forwardRef<EnhancedGlobeRef, EnhancedGlobeProps>(
  function EnhancedGlobe({ className, initialAlbumId, initialLat, initialLng, filterUserId, hideHeader = false }, ref) {
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
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 100 : 800
  }))
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0)
  const [showStaticConnections, setShowStaticConnections] = useState(true)
  const [arcsKey, setArcsKey] = useState(0) // Force re-render of arcs when needed
  const [progressionMode, setProgressionMode] = useState<'auto' | 'manual'>('auto')
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0)
  const [isJourneyPaused, setIsJourneyPaused] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const cameraAnimationRef = useRef<number | null>(null)
  const initialNavigationHandled = useRef(false)
  const globeContainerRef = useRef<HTMLDivElement | null>(null)
  const isVisibleRef = useRef(true)
  const isInViewportRef = useRef(true)
  const rendererRef = useRef<ThreeRenderer | null>(null)
  const disposedRef = useRef(false) // Track if cleanup has already occurred

  // Performance settings - automatically optimized based on hardware detection
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'balanced' | 'low'>('auto')
  const [hardwareAcceleration, setHardwareAcceleration] = useState<boolean | null>(null)

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

  // Store navigation handler in ref to avoid dependency issues
  const navigationHandlerRef = useRef<((albumId: string, lat: number, lng: number) => void) | null>(null)

  // Expose navigation method to parent component
  useImperativeHandle(ref, () => ({
    navigateToAlbum: (albumId: string, lat: number, lng: number) => {
      navigationHandlerRef.current?.(albumId, lat, lng)
    }
  }), [])

  // Auto-dismiss location errors after 8 seconds (except permission denied)
  useEffect(() => {
    if (locationError && permissionStatus !== 'denied') {
      const timer = setTimeout(() => {
        clearLocation()
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [locationError, permissionStatus, clearLocation])

  // Helper function to check if rendering should be active
  const shouldRender = useCallback(() => {
    return isVisibleRef.current && isInViewportRef.current
  }, [])

  // Page Visibility API - Pause rendering when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      isVisibleRef.current = isVisible

      log.info('Page visibility changed', {
        component: 'EnhancedGlobe',
        action: 'visibility-change',
        isVisible
      })

      if (!isVisible) {
        // Pause all animations when tab is hidden
        if (isAutoRotating) {
          setIsAutoRotating(false)
        }

        // Stop WebGL rendering
        if (rendererRef.current) {
          rendererRef.current.setAnimationLoop(null)
          log.info('Stopped WebGL rendering (tab hidden)', { component: 'EnhancedGlobe' })
        }
      } else {
        // Resume rendering when tab becomes visible
        if (rendererRef.current && shouldRender()) {
          // Re-enable animation loop
          const globeMethods = globeRef.current as unknown as GlobeInternals
          if (globeMethods.renderer) {
            const renderer = globeMethods.renderer()
            if (renderer) {
              // Restart the throttled animation loop
              log.info('Resumed WebGL rendering (tab visible)', { component: 'EnhancedGlobe' })
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAutoRotating, shouldRender])

  // Intersection Observer - Pause rendering when globe is out of viewport
  useEffect(() => {
    if (!globeContainerRef.current) return

    const observerOptions = {
      root: null,
      rootMargin: '100px', // Start rendering slightly before visible
      threshold: 0.1 // Trigger when 10% visible
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const isInViewport = entry.isIntersecting
        isInViewportRef.current = isInViewport

        log.info('Globe viewport visibility changed', {
          component: 'EnhancedGlobe',
          action: 'viewport-change',
          isInViewport,
          intersectionRatio: entry.intersectionRatio
        })

        if (!isInViewport) {
          // Pause animations when out of viewport
          if (isAutoRotating) {
            setIsAutoRotating(false)
          }

          // Stop WebGL rendering
          if (rendererRef.current) {
            rendererRef.current.setAnimationLoop(null)
            log.info('Stopped WebGL rendering (out of viewport)', { component: 'EnhancedGlobe' })
          }
        } else if (shouldRender()) {
          // Resume rendering when back in viewport and tab is visible
          if (rendererRef.current) {
            log.info('Resumed WebGL rendering (in viewport)', { component: 'EnhancedGlobe' })
          }
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersection, observerOptions)
    observer.observe(globeContainerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isAutoRotating, shouldRender])

  // Detect hardware acceleration
  useEffect(() => {
    const detectHardwareAcceleration = () => {
      let canvas: HTMLCanvasElement | null = null
      let gl: WebGLRenderingContext | null = null

      try {
        canvas = document.createElement('canvas')
        gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null

        if (!gl) {
          setHardwareAcceleration(false)
          // Auto-switch to low mode for better performance
          setPerformanceMode('low')
          log.warn('WebGL not available, using low performance mode')
          return
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
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
      } finally {
        // Critical: Clean up the WebGL context to avoid context limit errors
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context')
          if (loseContext) {
            loseContext.loseContext()
          }
        }
        // Remove canvas from memory
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
          canvas = null
        }
        gl = null
      }
    }

    detectHardwareAcceleration()
  }, [])


  // Handle container resize for responsive globe using ResizeObserver
  useEffect(() => {
    const updateDimensions = () => {
      // Get the globe container element to calculate available space properly
      const container = globeContainerRef.current

      let width: number
      let height: number

      if (container) {
        // Use actual container dimensions for accurate sizing
        const containerRect = container.getBoundingClientRect()
        width = containerRect.width
        height = containerRect.height

        // Log dimensions for debugging
        log.info('Globe container dimensions', {
          component: 'EnhancedGlobe',
          action: 'update-dimensions',
          width,
          height,
          hideHeader,
          containerElement: !!container
        })

        // Special handling for flex-1 containers that may not have computed height yet
        if (hideHeader && height === 0) {
          log.warn('Flex container has zero height, starting retry sequence', {
            component: 'EnhancedGlobe',
            action: 'update-dimensions',
            hideHeader
          })

          // Retry up to 3 times with increasing delays for slow layout computation
          const maxRetries = 3
          const retryDelays = [0, 50, 100] // ms delays between retries
          let retryCount = 0

          const attemptMeasure = () => {
            const retryRect = container.getBoundingClientRect()
            if (retryRect.height > 0) {
              log.info('Flex container height computed on retry', {
                component: 'EnhancedGlobe',
                action: 'update-dimensions',
                width: retryRect.width,
                height: retryRect.height,
                retryAttempt: retryCount
              })
              setWindowDimensions({ width: retryRect.width, height: retryRect.height })
            } else if (retryCount < maxRetries) {
              retryCount++
              log.info('Retrying dimension measurement', {
                component: 'EnhancedGlobe',
                action: 'update-dimensions',
                retryAttempt: retryCount,
                delayMs: retryDelays[retryCount]
              })
              setTimeout(() => requestAnimationFrame(attemptMeasure), retryDelays[retryCount])
            } else {
              // All retries exhausted, use parent or fallback dimensions
              const parentRect = container.parentElement?.getBoundingClientRect()
              if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
                log.warn('Using parent dimensions after failed retries', {
                  component: 'EnhancedGlobe',
                  action: 'update-dimensions',
                  parentWidth: parentRect.width,
                  parentHeight: parentRect.height
                })
                setWindowDimensions({ width: parentRect.width, height: parentRect.height })
              } else {
                // Use window dimensions as fallback - ResizeObserver will update with actual dimensions
                const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
                const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 800
                log.warn('Using window dimensions as fallback after all retries failed', {
                  component: 'EnhancedGlobe',
                  action: 'update-dimensions',
                  fallbackWidth,
                  fallbackHeight
                })
                setWindowDimensions({ width: fallbackWidth, height: fallbackHeight })
              }
            }
          }

          requestAnimationFrame(attemptMeasure)
          return // Don't update with 0 height
        }

        // Ensure we have valid dimensions
        if (width === 0 || height === 0) {
          // First try parent element's dimensions
          const parentRect = container.parentElement?.getBoundingClientRect()
          if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
            width = parentRect.width
            height = parentRect.height
            log.info('Using parent element dimensions as fallback', {
              component: 'EnhancedGlobe',
              action: 'update-dimensions',
              parentWidth: width,
              parentHeight: height,
              hideHeader
            })
          } else {
            // Use window dimensions as fallback - ResizeObserver will update with actual dimensions
            width = typeof window !== 'undefined' ? window.innerWidth : 1200
            height = typeof window !== 'undefined' ? window.innerHeight - 100 : 800

            log.warn('Globe container has zero dimensions, using window fallback', {
              component: 'EnhancedGlobe',
              action: 'update-dimensions',
              fallbackWidth: width,
              fallbackHeight: height,
              hideHeader
            })
          }
        }
      } else {
        // Fallback if container not yet available - use window dimensions
        // ResizeObserver will update with actual container dimensions
        width = typeof window !== 'undefined' ? window.innerWidth : 1200
        height = typeof window !== 'undefined' ? window.innerHeight - 100 : 800

        log.warn('Globe container ref not available, using window fallback', {
          component: 'EnhancedGlobe',
          action: 'update-dimensions',
          fallbackWidth: width,
          fallbackHeight: height,
          hideHeader
        })
      }

      // Only update if dimensions changed significantly (>10px to avoid jitter)
      setWindowDimensions(prev => {
        if (Math.abs(prev.width - width) > 10 || Math.abs(prev.height - height) > 10) {
          log.info('Updating globe dimensions', {
            component: 'EnhancedGlobe',
            action: 'update-dimensions',
            oldWidth: prev.width,
            oldHeight: prev.height,
            newWidth: width,
            newHeight: height,
            hideHeader
          })
          return { width, height }
        }
        return prev
      })
    }

    // Use requestAnimationFrame to wait for layout before initial measurement
    requestAnimationFrame(() => {
      updateDimensions()
    })

    // Use ResizeObserver for accurate container size tracking
    const container = globeContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(() => {
        updateDimensions()
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [hideHeader])


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

  // Memoize renderer config to prevent unnecessary Globe re-creation
  const rendererConfig = useMemo(() => ({
    antialias: false,
    powerPreference: 'low-power' as const
  }), [])

  // Travel timeline hook
  const {
    availableYears,
    loading: timelineLoading,
    error: timelineError,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData
  } = useTravelTimeline(filterUserId, instanceId)

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
          altitude: 2.8
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
    if (locations.length === 0) return { lat: 0, lng: 0, altitude: 3.5 }
    if (locations.length === 1) {
      return {
        lat: locations[0].latitude,
        lng: locations[0].longitude,
        altitude: 3.0
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

    // Calculate appropriate altitude based on span (increased for better zoom out)
    let altitude = 4.0
    if (maxSpan < 5) altitude = 3.5
    else if (maxSpan < 15) altitude = 3.7
    else if (maxSpan < 30) altitude = 4.0
    else if (maxSpan < 60) altitude = 4.5
    else altitude = 5.0

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
      // Don't lock user interaction - allow free movement after pausing
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
        altitude: 2.8
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
        altitude: 2.8
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

      // BUGFIX: Never auto-switch year filter when navigating between albums
      // Let users manually control the year filter - don't change it automatically
      // The chronologicalAlbums array contains ALL albums across all years, so navigation works regardless of filter

      // Prepare cluster data before state updates
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

      // Batch all state updates together to prevent multiple re-renders
      requestAnimationFrame(() => {
        setCurrentAlbumIndex(newIndex)
        setActiveCityId(nextAlbum.locationId)
        setSelectedCluster(cluster)
        setShowAlbumModal(true)

        // Animate camera smoothly
        if (globeRef.current) {
          animateCameraToPosition({
            lat: nextAlbum.latitude,
            lng: nextAlbum.longitude,
            altitude: 2.8
          }, 1200, 'easeInOutCubic')
        }
      })
    }
  }, [currentAlbumIndex, chronologicalAlbums, animateCameraToPosition])

  const navigateToPreviousAlbum = useCallback(() => {
    if (currentAlbumIndex > 0) {
      const newIndex = currentAlbumIndex - 1
      const prevAlbum = chronologicalAlbums[newIndex]

      // BUGFIX: Never auto-switch year filter when navigating between albums
      // Let users manually control the year filter - don't change it automatically
      // The chronologicalAlbums array contains ALL albums across all years, so navigation works regardless of filter

      // Prepare cluster data before state updates
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

      // Batch all state updates together to prevent multiple re-renders
      requestAnimationFrame(() => {
        setCurrentAlbumIndex(newIndex)
        setActiveCityId(prevAlbum.locationId)
        setSelectedCluster(cluster)
        setShowAlbumModal(true)

        // Animate camera smoothly
        if (globeRef.current) {
          animateCameraToPosition({
            lat: prevAlbum.latitude,
            lng: prevAlbum.longitude,
            altitude: 2.8
          }, 1200, 'easeInOutCubic')
        }
      })
    }
  }, [currentAlbumIndex, chronologicalAlbums, animateCameraToPosition])

  const showCurrentAlbum = useCallback(() => {
    if (currentAlbum) {
      // Navigate to the current album's location and show it
      setActiveCityId(currentAlbum.locationId)

      // BUGFIX: Don't automatically switch year filter when navigating between albums
      // Users should be able to see all pins from all years, even when viewing a specific album
      // This allows jumping from a 2025 album to a 2020 album without forcing a filter change

      if (globeRef.current) {
        animateCameraToPosition({
          lat: currentAlbum.latitude,
          lng: currentAlbum.longitude,
          altitude: 2.8
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
  }, [currentAlbum, animateCameraToPosition])

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

  // Stable refs for keyboard shortcuts
  const showSearchRef = useRef(showSearch)
  const selectedYearRef = useRef(selectedYear)
  const availableYearsRef = useRef(availableYears)
  const progressionModeRef = useRef(progressionMode)
  const isJourneyPausedRef = useRef(isJourneyPaused)
  const locationsRef = useRef(locations)

  // Update refs when values change
  useEffect(() => {
    showSearchRef.current = showSearch
    selectedYearRef.current = selectedYear
    availableYearsRef.current = availableYears
    progressionModeRef.current = progressionMode
    isJourneyPausedRef.current = isJourneyPaused
    locationsRef.current = locations
  }, [showSearch, selectedYear, availableYears, progressionMode, isJourneyPaused, locations])

  // Keyboard shortcuts with passive listener - optimized with refs to eliminate dependencies
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toLowerCase()

      // Early return for common non-shortcut keys - expanded list
      if (key.length > 1 && !['escape', 'arrowleft', 'arrowright', 'space'].includes(key)) {
        return
      }

      switch (key) {
        case ' ':
          event.preventDefault()
          if (locationsRef.current.length > 1) {
            handlePlayPause()
          } else if (locationsRef.current.length === 1) {
            // For single locations, open the album modal to show photos
            const location = locationsRef.current[0]
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
          setShowSearch(!showSearchRef.current)
          break
        case 'escape':
          event.preventDefault()
          setShowSearch(false)
          setShowAlbumModal(false)
          break
        case 'm':
          event.preventDefault()
          if (locationsRef.current.length > 1) {
            toggleProgressionMode()
          }
          break
        case 'arrowleft':
          event.preventDefault()
          if (selectedYearRef.current && availableYearsRef.current.length > 0) {
            const currentIndex = availableYearsRef.current.indexOf(selectedYearRef.current)
            if (currentIndex > 0) {
              handleYearChange(availableYearsRef.current[currentIndex - 1])
            }
          }
          break
        case 'arrowright':
          event.preventDefault()
          if (selectedYearRef.current && availableYearsRef.current.length > 0) {
            const currentIndex = availableYearsRef.current.indexOf(selectedYearRef.current)
            if (currentIndex < availableYearsRef.current.length - 1) {
              handleYearChange(availableYearsRef.current[currentIndex + 1])
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
        case '.':
          event.preventDefault()
          if (progressionModeRef.current === 'manual' && locationsRef.current.length > 1) {
            advanceToNextLocation()
          }
          break
        case ',':
          event.preventDefault()
          if (progressionModeRef.current === 'manual' && locationsRef.current.length > 1) {
            goToPreviousLocation()
          }
          break
        case 'c':
          event.preventDefault()
          if (isJourneyPausedRef.current && progressionModeRef.current === 'manual') {
            resumeJourney()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePlayPause, handleReset, handleYearChange, toggleProgressionMode, advanceToNextLocation, goToPreviousLocation, resumeJourney])


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

  // Convert locations to city pins - memoized and limited by performance mode
  const cityPins: CityPin[] = useMemo(() => {
    // Limit number of pins based on performance mode
    const maxPins = performanceConfig.maxPins
    const limitedLocations = locations.slice(0, maxPins)

    return limitedLocations.map(location => {
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
  }, [locations, activeCityId, performanceConfig.maxPins])

  // Static connection arcs - connect trips in chronological order (performance optimized)
  const staticConnections = useMemo(() => {
    if (!showStaticConnections || locations.length < 2) return []

    // Limit connections based on performance mode
    const maxConnections = performanceConfig.maxPins - 1
    const limitedLocations = locations.slice(0, maxConnections + 1)

    // Sort locations by visit date
    const sortedLocations = [...limitedLocations].sort((a, b) =>
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
  }, [locations, showStaticConnections, getYearColor, selectedYear, performanceConfig.maxPins])


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

    // Add current location pin if available and visible
    if (currentLocation && showCurrentLocation) {
      pins.push({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        size: 2.5, // Slightly larger than regular pins
        color: '#10b981', // Green color for current location
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
  // BUGFIX: Removed isPlaying from dependencies - it should only control flight animation, not auto-rotation
  // User should be able to interact with globe whether flight animation is playing or paused
  useEffect(() => {
    if (!globeRef.current || !isAutoRotating || userInteracting) {
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
  }, [isAutoRotating, userInteracting])

  // Modal state management - Pause rendering when modal is open to save GPU
  useEffect(() => {
    // Keep ref in sync with state
    modalOpenRef.current = showAlbumModal

    if (showAlbumModal) {
      // Pause auto-rotation when modal opens
      if (isAutoRotating) {
        setIsAutoRotating(false)
      }

      // Pause WebGL animation loop to reduce GPU usage
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        log.info('Modal opened, paused WebGL animation loop', { component: 'EnhancedGlobe' })
      }

      // Also pause globe controls to prevent unnecessary updates
      if (globeRef.current) {
        const controls = globeRef.current.controls() as OrbitControls | undefined
        if (controls && 'enabled' in controls) {
          controls.enabled = false
        }
      }
    } else {
      // Resume rendering when modal closes
      if (rendererRef.current && shouldRender()) {
        // Re-enable globe controls
        if (globeRef.current) {
          const controls = globeRef.current.controls() as OrbitControls | undefined
          if (controls && 'enabled' in controls) {
            controls.enabled = true
          }
        }

        // Restart animation loop with the globe's internal render function
        const globeMethods = globeRef.current as unknown as GlobeInternals
        if (globeMethods.renderer) {
          const renderer = globeMethods.renderer()
          if (renderer) {
            // Note: The globe component will restart its own animation loop
            log.info('Modal closed, resumed WebGL animation', { component: 'EnhancedGlobe' })
          }
        }
      }
    }
  }, [showAlbumModal, isAutoRotating, shouldRender])

  // Cleanup on unmount - Comprehensive cleanup of all resources
  useEffect(() => {
    // Store ref value at the top of effect for cleanup
    const globe = globeRef.current

    return () => {
      // Prevent double cleanup (important for React StrictMode)
      if (disposedRef.current) {
        log.info('Cleanup already performed, skipping', { component: 'EnhancedGlobe' })
        return
      }
      disposedRef.current = true

      log.info('Cleaning up globe component', {
        component: 'EnhancedGlobe',
        action: 'cleanup-unmount'
      })

      // Cancel all animation frames
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current as unknown as number)
        autoRotateRef.current = null
      }
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current)
        cameraAnimationRef.current = null
      }

      // Stop WebGL rendering
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        rendererRef.current = null
      }

      // Dispose Three.js resources
      if (globe) {
        const globeMethods = globe as unknown as GlobeInternals
        const scene = globeMethods.scene?.()
        const renderer = globeMethods.renderer?.()

        // Dispose of all geometries and materials in the scene
        if (scene && typeof scene === 'object' && 'traverse' in scene) {
          interface ThreeObject {
            geometry?: { dispose: () => void }
            material?: { dispose: () => void } | Array<{ dispose: () => void }>
          }

          (scene as { traverse: (callback: (obj: ThreeObject) => void) => void }).traverse((object: ThreeObject) => {
            if (object.geometry) {
              object.geometry.dispose()
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose())
              } else {
                object.material.dispose()
              }
            }
          })
        }

        // Enhanced renderer disposal with WebGL context cleanup
        if (renderer && typeof renderer === 'object') {
          interface WebGLRenderer extends ThreeRenderer {
            dispose: () => void
            forceContextLoss?: () => void
            domElement?: HTMLCanvasElement
          }

          const webglRenderer = renderer as unknown as WebGLRenderer

          // Force context loss before disposal (critical for preventing context exhaustion)
          if (webglRenderer.forceContextLoss) {
            try {
              webglRenderer.forceContextLoss()
              log.info('Forced WebGL context loss', { component: 'EnhancedGlobe' })
            } catch (error) {
              log.error('Error forcing context loss', { component: 'EnhancedGlobe' }, error as Error)
            }
          }

          // Dispose renderer
          if ('dispose' in webglRenderer) {
            try {
              webglRenderer.dispose()
              log.info('WebGL renderer disposed', { component: 'EnhancedGlobe' })
            } catch (error) {
              log.error('Error disposing renderer', { component: 'EnhancedGlobe' }, error as Error)
            }
          }

          // Remove canvas element from DOM as final cleanup
          if (webglRenderer.domElement && webglRenderer.domElement.parentNode) {
            webglRenderer.domElement.parentNode.removeChild(webglRenderer.domElement)
            log.info('Canvas removed from DOM', { component: 'EnhancedGlobe' })
          }
        }
      }

      // Clear globe ref
      globeRef.current = undefined
    }
  }, [])

  // WebGL context lost/restored event handlers - Error recovery
  useEffect(() => {
    if (!globeContainerRef.current) return

    const canvas = globeContainerRef.current.querySelector('canvas')
    if (!canvas) return

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      log.error('WebGL context lost', {
        component: 'EnhancedGlobe',
        action: 'webgl-context-lost'
      })

      // Attempt to prevent default context loss behavior
      // The browser will automatically try to restore the context
    }

    const handleContextRestored = () => {
      log.info('WebGL context restored', {
        component: 'EnhancedGlobe',
        action: 'webgl-context-restored'
      })

      // Reset disposed flag to allow re-initialization if needed
      disposedRef.current = false

      // The globe component should automatically reinitialize
      // but we can force a re-render if needed
      setGlobeReady(false)
      setTimeout(() => setGlobeReady(true), 100)
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [globeReady])

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
      altitude: 2.8
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

  // Auto-position to current location when available
  useEffect(() => {
    if (currentLocation && showCurrentLocation && globeReady && !initialNavigationHandled.current) {
      // Animate to current location
      animateCameraToPosition({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        altitude: 3.0
      }, 2000, 'easeInOutCubic')

      log.info('Globe auto-positioned to current location', {
        component: 'EnhancedGlobe',
        action: 'auto-position-current-location',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      })
    }
  }, [currentLocation, showCurrentLocation, globeReady, animateCameraToPosition])

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

    // Find the album's position in the chronological journey
    const albumIndex = chronologicalAlbums.findIndex(
      album => album.locationId === city.id || album.albumId === city.id
    )
    if (albumIndex !== -1) {
      setCurrentAlbumIndex(albumIndex)
    }

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
        altitude: 2.8
      }, 1200, 'easeInOutCubic')
    }
    // Don't auto-enable rotation - let user toggle it manually
  }

  function handleClusterClick(cluster: CityCluster) {
    setSelectedCluster(cluster)
    setShowAlbumModal(true)
    setIsAutoRotating(false)

    // Find the first album's position in the chronological journey
    if (cluster.cities.length > 0) {
      const firstCityId = cluster.cities[0].id
      const albumIndex = chronologicalAlbums.findIndex(
        album => album.locationId === firstCityId || album.albumId === firstCityId
      )
      if (albumIndex !== -1) {
        setCurrentAlbumIndex(albumIndex)
      }
    }

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
        altitude: 2.5
      }, 1200, 'easeInOutCubic')
    }
    // Don't auto-enable rotation - let user toggle it manually
  }

  // Set navigation handler for imperative handle (defined after dependencies are available)
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

  function zoomIn() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.max(1.0, pov.altitude * 0.8)
      animateCameraToPosition({ ...pov, altitude: newAltitude }, 400, 'easeInOutQuad')
      setIsAutoRotating(false)
      // Don't auto-enable rotation
    }
  }

  function zoomOut() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      const newAltitude = Math.min(6, pov.altitude * 1.2)
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
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-teal-600" />
          <h2 className="text-xl font-semibold mt-4">Loading your travel timeline...</h2>
          <p className="text-gray-800 mt-2">Preparing flight animation data</p>
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
      {/* Compact Header - Only show when not embedded */}
      {!hideHeader && (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 p-6 text-white shadow-xl">
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
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{cityPinSystem.clusters.length}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Location{cityPinSystem.clusters.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0)}
                </div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Album{cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalAlbums, 0) !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">
                  {cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0)}
                </div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Photo{cityPinSystem.clusters.reduce((sum, cluster) => sum + cluster.totalPhotos, 0) !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{availableYears.length}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Year{availableYears.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{travelStats.countriesPercentage}%</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">{travelStats.countriesVisited} Countr{travelStats.countriesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{travelStats.citiesPercentage}%</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">{travelStats.citiesVisited} Cit{travelStats.citiesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Quick Actions - Centered */}
      {!hideHeader && (
      <div className="flex items-center justify-center gap-2 mb-4">
        <Link href="/albums/new">
          <Button size="sm" className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            {filterUserId ? 'Add Your Own Adventure' : 'Add Adventure'}
          </Button>
        </Link>
      </div>
      )}

      {/* Globe Container with Floating Controls */}
      <div className="relative flex-1 h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Floating Controls - Top Right Only */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1.5 backdrop-blur-xl bg-gray-900/95 rounded-xl p-1.5 shadow-2xl border border-white/10">
            {/* Travel Routes Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStaticConnections(!showStaticConnections)}
              className={cn("h-9 w-9 p-0 text-white hover:bg-white/20 rounded-lg transition-all", showStaticConnections && 'bg-teal-500/30 text-teal-200')}
              title="Toggle travel routes"
            >
              <Route className="h-4 w-4" />
            </Button>

            {/* Location Permission Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (showCurrentLocation && currentLocation) {
                  // If already showing, hide it
                  setShowCurrentLocation(false)
                  clearLocation()
                } else if (permissionStatus === 'denied') {
                  // Show a helpful message about enabling location
                  return
                } else {
                  // Request location
                  await requestLocation()
                  if (!locationError) {
                    setShowCurrentLocation(true)
                  }
                }
              }}
              disabled={locationLoading || permissionStatus === 'unsupported' || permissionStatus === 'denied'}
              className={cn(
                "h-9 w-9 p-0 rounded-lg transition-all",
                permissionStatus === 'denied' && "opacity-50 cursor-not-allowed",
                showCurrentLocation
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "text-white hover:bg-white/20",
                (locationLoading || permissionStatus === 'unsupported' || permissionStatus === 'denied') && "hover:bg-white/10"
              )}
              title={
                locationLoading
                  ? "Detecting location..."
                  : permissionStatus === 'denied'
                  ? "Location access denied. Enable in browser settings to use this feature."
                  : permissionStatus === 'unsupported'
                  ? "Location is not supported on this device"
                  : showCurrentLocation
                  ? "Hide current location"
                  : "Show my location"
              }
            >
              {locationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : permissionStatus === 'denied' ? (
                <Navigation className="h-4 w-4 opacity-50" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Location Error Toast - Auto-dismiss after showing */}
        {locationError && permissionStatus !== 'denied' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="backdrop-blur-xl bg-yellow-500/95 text-white rounded-xl p-4 shadow-2xl border border-yellow-400/20">
              <div className="flex items-start gap-3">
                <LocationIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Location Unavailable</p>
                  <p className="text-xs mt-1 opacity-90">{locationError}</p>
                  <p className="text-xs mt-2 opacity-75">Try again or search for a location manually.</p>
                </div>
                <button
                  onClick={() => clearLocation()}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied Info - Persistent */}
        {permissionStatus === 'denied' && locationError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="backdrop-blur-xl bg-red-500/95 text-white rounded-xl p-4 shadow-2xl border border-red-400/20">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-sm">Location Access Blocked</p>
                  <p className="text-xs mt-1 opacity-90">Location permission was denied.</p>
                  <p className="text-xs mt-2 opacity-90">
                    To enable: Click the <span className="font-semibold">lock icon</span> in your browser&apos;s address bar → Allow location access → Reload the page.
                  </p>
                </div>
                <button
                  onClick={() => clearLocation()}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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

      {/* Consolidated Timeline Controls - Only show when not embedded in hideHeader mode */}
      {!hideHeader && availableYears.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-700/50">
          <div className="space-y-6">
            {/* Year Selection */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-cyan-500"></div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Travel Timeline
                </h3>
                <div className="h-px w-12 bg-gradient-to-r from-cyan-500 via-teal-500 to-transparent"></div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {/* All Years Button */}
                <button
                  onClick={() => setSelectedYear(null)}
                  className={cn(
                    "group relative px-6 py-3.5 rounded-2xl transition-all duration-300 min-w-[110px] overflow-hidden",
                    !selectedYear
                      ? "bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 scale-105 hover:shadow-xl hover:shadow-teal-500/40"
                      : "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-slate-500"
                  )}
                >
                  <div className="relative z-10">
                    <div className={cn(
                      "font-bold text-2xl",
                      !selectedYear ? "text-white" : "text-slate-200"
                    )}>
                      All Years
                    </div>
                    <div className={cn(
                      "text-sm mt-1 font-medium",
                      !selectedYear ? "text-teal-50" : "text-slate-400"
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
                          "font-bold text-2xl",
                          isSelected ? "text-white" : "text-slate-200"
                        )}>
                          {year}
                        </div>
                        {yearData && (
                          <div className={cn(
                            "text-sm mt-1 font-medium",
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
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-teal-500/20 rounded-lg">
                              <Plane className="h-4 w-4 text-teal-400 flex-shrink-0" />
                            </div>
                            <span className="text-base font-bold text-slate-400 uppercase tracking-widest">
                              Location {currentLocationIndex + 1} of {locations.length}
                            </span>
                          </div>
                          <div className="font-bold text-white text-2xl leading-tight mb-1.5">
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
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-teal-500/50"
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
        <div
          ref={globeContainerRef}
          className={cn(
            "globe-container overflow-hidden relative flex items-center justify-center",
            hideHeader ? "flex-1 w-full h-full" : "rounded-2xl w-full h-full"
          )}
          style={hideHeader ? { minHeight: '100%', height: '100%' } : { contain: 'layout size' }}>
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl={undefined}
                  backgroundColor="rgba(15, 23, 42, 1)"
                  width={windowDimensions.width}
                  height={windowDimensions.height}
                  showAtmosphere={performanceConfig.showAtmosphere}
                  atmosphereColor="rgb(135, 206, 250)"
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

                  // Performance optimizations - use memoized config to prevent re-creation
                  rendererConfig={rendererConfig}

                  // City pins + current location pin
                  htmlElementsData={allPinData}
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
                      cluster?: CityCluster;
                      isMultiCity?: boolean;
                      isActive?: boolean;
                      isCurrentLocation?: boolean;
                      label: string;
                      albumCount: number;
                      photoCount: number;
                      accuracy?: number;
                    }
                    const el = document.createElement('div')
                    const pinSize = Math.max(data.size * 24, 50)

                    // Set up the container with proper event handling
                    el.style.cssText = `
                      position: relative;
                      width: ${pinSize}px;
                      height: ${pinSize}px;
                      cursor: ${data.isCurrentLocation ? 'default' : 'pointer'};
                      pointer-events: auto;
                      z-index: ${data.isCurrentLocation ? 20 : 10};
                      user-select: none;
                      -webkit-user-select: none;
                      -webkit-touch-callout: none;
                    `

                    // Handle current location pin differently
                    if (data.isCurrentLocation) {
                      // TODO: SECURITY - Refactor to use DOM APIs (createElement, appendChild) instead of innerHTML
                      el.innerHTML = `
                        <div class="globe-pin current-location-pin" style="
                          width: 100%;
                          height: 100%;
                          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                          border: 3px solid white;
                          border-radius: 50%;
                          opacity: ${data.opacity};
                          box-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(0,0,0,0.4);
                          cursor: default;
                          position: relative;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          pointer-events: none;
                          will-change: transform;
                          animation: pulse-current-location 2s infinite;
                        ">
                          <!-- Navigation icon for current location -->
                          <svg width="${Math.max(pinSize * 0.5, 28)}" height="${Math.max(pinSize * 0.5, 28)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                            <polygon points="3 11 22 2 13 21 11 13 3 11" />
                          </svg>

                          <!-- Pulsing ring -->
                          <div style="
                            position: absolute;
                            inset: -8px;
                            border: 2px solid rgba(16, 185, 129, 0.5);
                            border-radius: 50%;
                            animation: pulse-ring 2s infinite;
                            pointer-events: none;
                          "></div>
                        </div>

                        <style>
                          @keyframes pulse-current-location {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                          }
                          @keyframes pulse-ring {
                            0% { transform: scale(1); opacity: 0.6; }
                            100% { transform: scale(1.5); opacity: 0; }
                          }
                        </style>
                      `
                      return el
                    }

                    // Get year from location data to determine color
                    const location = locations.find(loc =>
                      Math.abs(loc.latitude - data.lat) < 0.001 &&
                      Math.abs(loc.longitude - data.lng) < 0.001
                    )
                    const locationYear = location ? location.visitDate.getFullYear() : new Date().getFullYear()
                    const yearColor = getYearColor(locationYear)

                    // Simplified background color (no gradient for performance)
                    const pinColor = data.isActive ? '#ffa500' : yearColor

                    // TODO: SECURITY - Refactor to use DOM APIs (createElement, appendChild) instead of innerHTML
                    // Current implementation uses escapeHtml as temporary XSS protection
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
                        transition: transform 0.2s ease, box-shadow 0.2s ease, border-width 0.2s ease;
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
                          ">${data.cluster ? escapeHtml(String(data.cluster.cities.length)) : ''}</div>
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
                    // Note: Don't transform the outer container (el) - react-globe.gl controls its transform for positioning
                    el.addEventListener('mouseenter', () => {
                      el.style.zIndex = '1000'
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        // Scale the inner pin element instead of the container
                        pinElement.style.transform = 'scale(1.3)'
                        pinElement.style.boxShadow = `
                          0 10px 40px rgba(0,0,0,0.4),
                          0 5px 20px ${data.isActive ? '#3b82f6aa' : `${yearColor}aa`},
                          inset 0 -3px 8px rgba(0,0,0,0.2),
                          inset 0 3px 8px rgba(255,255,255,0.5)
                        `
                        pinElement.style.borderWidth = '4px'
                      }

                      // Remove any existing tooltip from document.body first
                      const tooltipId = `globe-tooltip-${data.cluster?.id}`
                      const existingTooltip = document.getElementById(tooltipId)
                      if (existingTooltip) {
                        existingTooltip.remove()
                      }

                      // Add cleaner tooltip with album cover photo - positioned at document.body level
                      const city = data.cluster?.cities[0]
                      if (data.cluster && city && (city.coverPhotoUrl || city.favoritePhotoUrls?.length)) {
                        // Prioritize cover photo, then first favorite, then first available photo
                        const photoUrl = city.coverPhotoUrl || city.favoritePhotoUrls?.[0]
                        if (photoUrl) {
                          // Get pin position for tooltip placement
                          const rect = el.getBoundingClientRect()

                          const tooltip = document.createElement('div')
                          tooltip.id = tooltipId
                          tooltip.className = 'photo-preview-tooltip'
                          // TODO: SECURITY - Refactor to use DOM APIs (createElement, appendChild) instead of innerHTML
                          // Current implementation uses escapeHtml/escapeAttr as temporary XSS protection
                          tooltip.innerHTML = `
                            <div style="
                              position: fixed;
                              left: ${rect.left + rect.width / 2}px;
                              bottom: ${window.innerHeight - rect.top + 15}px;
                              transform: translateX(-50%);
                              background: white;
                              border-radius: 16px;
                              padding: 6px;
                              box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                              border: 3px solid ${data.isActive ? '#3b82f6' : '#ef4444'};
                              z-index: 9999;
                              pointer-events: none;
                              opacity: 0;
                              transition: all 0.25s ease;
                            ">
                              <img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(city.name)}" style="
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
                              ">${escapeHtml(city.name)}</div>
                              <div style="
                                text-align: center;
                                font-size: 11px;
                                color: #6b7280;
                                margin-top: 3px;
                                font-weight: 600;
                              ">${escapeHtml(String(data.cluster?.totalPhotos || 0))} photo${data.cluster?.totalPhotos === 1 ? '' : 's'}</div>
                            </div>
                          `
                          document.body.appendChild(tooltip)

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
                      el.style.zIndex = String(data.isCurrentLocation ? 20 : 10)
                      const pinElement = el.querySelector('.globe-pin') as HTMLElement
                      if (pinElement) {
                        pinElement.style.transform = 'scale(1)'
                        pinElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
                        pinElement.style.borderWidth = data.isActive ? '4px' : '3px'
                      }

                      // Remove tooltip from document.body
                      const tooltipId = `globe-tooltip-${data.cluster?.id}`
                      const existingTooltip = document.getElementById(tooltipId)
                      if (existingTooltip) {
                        const tooltipElement = existingTooltip.querySelector('div') as HTMLElement
                        if (tooltipElement) {
                          tooltipElement.style.opacity = '0'
                          tooltipElement.style.transform = 'translateX(-50%) translateY(0)'
                          setTimeout(() => {
                            existingTooltip.remove()
                          }, 250)
                        } else {
                          existingTooltip.remove()
                        }
                      }
                    })

                    // Add tooltip
                    if (data.cluster) {
                      el.title = formatPinTooltip(data.cluster)
                    }

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
                  // Use arcsKey to force re-render when needed (e.g., after modal close)
                  arcsData={performanceConfig.showArcs && showStaticConnections ? [...staticConnections] : []}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor={(d: object) => {
                    const path = d as FlightPath
                    // Vibrant, glowing colors - use RGB format for THREE.js compatibility
                    return path.color
                  }}
                  arcAltitude={0.25} // Lower, more natural arc curve
                  arcStroke={() => {
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

                    // Throttle rendering based on performance mode for CPU optimization
                    if (globeRef.current) {
                      const globeMethods = globeRef.current as unknown as GlobeInternals
                      const scene = globeMethods.scene?.()
                      if (scene) {
                        const renderer = globeMethods.renderer?.()
                        if (renderer) {
                          // Store renderer reference for visibility control
                          rendererRef.current = renderer

                          const originalSetAnimationLoop = renderer.setAnimationLoop.bind(renderer)
                          let lastFrameTime = 0

                          // Adaptive FPS based on performance mode
                          const targetFPS = effectivePerformanceMode === 'high' ? 60 :
                                          effectivePerformanceMode === 'balanced' ? 30 : 20
                          const frameInterval = 1000 / targetFPS

                          renderer.setAnimationLoop = (callback: ((time: number) => void) | null) => {
                            if (!callback) {
                              originalSetAnimationLoop(null)
                              return
                            }
                            originalSetAnimationLoop((time: number) => {
                              // Check visibility before rendering
                              if (!shouldRender()) {
                                // Skip rendering if not visible or out of viewport
                                return
                              }

                              // Also skip rendering if modal is open to save GPU
                              if (modalOpenRef.current) {
                                return
                              }

                              // Skip frames if CPU is busy
                              if (time - lastFrameTime >= frameInterval) {
                                lastFrameTime = time
                                callback(time)
                              }
                            })
                          }

                          log.info('Globe renderer initialized with visibility-aware throttling', {
                            component: 'EnhancedGlobe',
                            targetFPS,
                            performanceMode: effectivePerformanceMode
                          })
                        }
                      }

                      // Set initial view based on locations or default to India
                      if (locations.length > 0) {
                        // If user has locations, show optimal view of their travels
                        const optimalPosition = calculateOptimalCameraPosition(locations)
                        setTimeout(() => {
                          animateCameraToPosition(optimalPosition, 2000, 'easeInOutExpo')
                        }, 1000)
                      } else {
                        // No locations yet - try to get current location, fallback to India
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              // Got current location - animate to it
                              globeRef.current?.pointOfView({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                altitude: 3.2
                              }, 1500)
                              log.info('Globe centered on current location', {
                                component: 'EnhancedGlobe',
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                              })
                            },
                            () => {
                              // Geolocation failed or denied - default to India
                              globeRef.current?.pointOfView({
                                lat: 20.5937, // Center of India
                                lng: 78.9629,
                                altitude: 3.2
                              }, 1500)
                              log.info('Globe centered on India (default)', {
                                component: 'EnhancedGlobe'
                              })
                            }
                          )
                        } else {
                          // Geolocation not available - default to India
                          globeRef.current?.pointOfView({
                            lat: 20.5937, // Center of India
                            lng: 78.9629,
                            altitude: 3.2
                          }, 1500)
                          log.info('Globe centered on India (no geolocation)', {
                            component: 'EnhancedGlobe'
                          })
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
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                )}

        {/* Compact Timeline Controls for Embedded View - Positioned above album strip */}
        {hideHeader && availableYears.length > 0 && (
          <div
            className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-30 max-w-[90%] w-auto"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="bg-slate-900/95 backdrop-blur-xl rounded-xl px-4 py-3 shadow-2xl border border-slate-600/50"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {/* All Years Button */}
                <button
                  onClick={() => setSelectedYear(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 min-h-[44px] min-w-[80px]",
                    !selectedYear
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30"
                      : "bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border border-slate-500/50"
                  )}
                >
                  All Years
                </button>

                {/* Individual Year Buttons */}
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={cn(
                      "px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 min-h-[44px] min-w-[64px]",
                      selectedYear === year
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30"
                        : "bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border border-slate-500/50"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
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
          // BUGFIX: Allow globe interaction after closing modal
          setUserInteracting(false)

          // Properly clean up GPU resources when modal closes
          // Force re-render of arcs to ensure they persist
          if (globeRef.current && rendererRef.current) {
            // Trigger a frame to ensure Three.js updates properly
            globeRef.current.controls()?.update()

            // Force arcs to re-render by incrementing key
            setArcsKey(prev => prev + 1)

            // Ensure static connections are visible
            if (!showStaticConnections && staticConnections.length > 0) {
              setShowStaticConnections(true)
            }

            log.info('Modal closed, refreshing globe state', {
              component: 'EnhancedGlobe',
              action: 'modal-close',
              hasArcs: staticConnections.length > 0,
              showStaticConnections,
              arcsKey: arcsKey + 1
            })
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