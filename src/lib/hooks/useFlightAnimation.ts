'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FlightAnimationEngine } from '@/lib/flight-animation'
import { FlightPathCalculator, type FlightPath } from '@/lib/utils/flightPaths'
import { type TravelLocation } from './useTravelTimeline'

interface FlightAnimationState {
  position: {
    lat: number
    lng: number
    altitude: number
  }
  rotation: {
    heading: number
    pitch: number
    bank: number
  }
  speed: number
  progress: number
}

interface FlightProgress {
  currentSegment: number
  totalSegments: number
  segmentProgress: number
  overallProgress: number
  currentLocation: TravelLocation | null
  nextLocation: TravelLocation | null
  estimatedTimeRemaining: number
}

interface CameraPosition {
  lat: number
  lng: number
  altitude: number
}

interface UseFlightAnimationOptions {
  autoPlay?: boolean
  defaultSpeed?: number
  cameraFollowsPlane?: boolean
  onSegmentComplete?: (location: TravelLocation) => void
  onAnimationComplete?: () => void
  onError?: (error: string) => void
}

interface UseFlightAnimationReturn {
  // Animation state
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean
  error: string | null

  // Flight data
  flightPaths: FlightPath[]
  currentFlightState: FlightAnimationState | null
  progress: FlightProgress
  cameraPosition: CameraPosition | null
  destinationCameraPosition: CameraPosition | null

  // Controls
  play: () => void
  pause: () => void
  stop: () => void
  reset: () => void
  setSpeed: (speed: number) => void
  setLocations: (locations: TravelLocation[]) => void
  seekToSegment: (segment: number) => void
  seekToProgress: (progress: number) => void

  // Configuration
  speed: number
  totalDuration: number
  setAutoPlay: (autoPlay: boolean) => void
  setCameraFollow: (follow: boolean) => void
}

export function useFlightAnimation(
  options: UseFlightAnimationOptions = {}
): UseFlightAnimationReturn {
  const {
    autoPlay = false,
    defaultSpeed = 1,
    cameraFollowsPlane = true,
    onSegmentComplete,
    onAnimationComplete,
    onError
  } = options

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeedState] = useState(defaultSpeed)
  const [locations, setLocationsState] = useState<TravelLocation[]>([])
  const [flightPaths, setFlightPaths] = useState<FlightPath[]>([])
  const [currentFlightState, setCurrentFlightState] = useState<FlightAnimationState | null>(null)
  const [cameraPosition, setCameraPosition] = useState<CameraPosition | null>(null)
  const [destinationCameraPosition, setDestinationCameraPosition] = useState<CameraPosition | null>(null)
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState(cameraFollowsPlane)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(autoPlay)

  // Progress state
  const [progress, setProgress] = useState<FlightProgress>({
    currentSegment: 0,
    totalSegments: 0,
    segmentProgress: 0,
    overallProgress: 0,
    currentLocation: null,
    nextLocation: null,
    estimatedTimeRemaining: 0
  })

  // Refs
  const animationEngineRef = useRef<FlightAnimationEngine | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  /**
   * Initialize flight animation engine
   */
  const initializeEngine = useCallback(() => {
    if (animationEngineRef.current) {
      return
    }

    animationEngineRef.current = new FlightAnimationEngine(
      // Position update callback
      (airplaneState) => {
        setCurrentFlightState({
          position: {
            lat: airplaneState.position.lat,
            lng: airplaneState.position.lng,
            altitude: airplaneState.position.altitude || 0
          },
          rotation: airplaneState.rotation,
          speed: airplaneState.speed,
          progress: animationEngineRef.current?.getProgress().percentage || 0
        })
      },
      // Camera update callback
      (position) => {
        if (cameraFollowEnabled) {
          setCameraPosition(position)
        }
      },
      // Segment complete callback
      (segment) => {
        const location = locations.find(loc => loc.id === segment.id)
        if (location) {
          // Set destination camera position to focus on the completed destination
          setDestinationCameraPosition({
            lat: location.latitude,
            lng: location.longitude,
            altitude: 1.5
          })
          onSegmentComplete?.(location)
        }
      }
    )
  }, [cameraFollowEnabled, locations, onSegmentComplete])

  /**
   * Generate flight paths from locations
   */
  const generateFlightPaths = useCallback(async (travelLocations: TravelLocation[]) => {
    if (travelLocations.length < 2) {
      setFlightPaths([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const paths: FlightPath[] = []

      for (let i = 0; i < travelLocations.length - 1; i++) {
        const start = travelLocations[i]
        const end = travelLocations[i + 1]

        const flightPath = FlightPathCalculator.generateFlightPath(
          {
            lat: start.latitude,
            lng: start.longitude,
            name: start.name
          },
          {
            lat: end.latitude,
            lng: end.longitude,
            name: end.name
          }
        )

        paths.push(flightPath)
      }

      setFlightPaths(paths)

      // Update progress with new data
      setProgress(prev => ({
        ...prev,
        totalSegments: paths.length,
        currentLocation: travelLocations[0] || null,
        nextLocation: travelLocations[1] || null
      }))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate flight paths'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  /**
   * Start flight animation
   */
  const play = useCallback(() => {
    if (!animationEngineRef.current || flightPaths.length === 0) return

    setIsPlaying(true)
    setIsPaused(false)
    setError(null)

    animationEngineRef.current.play()
  }, [flightPaths.length])

  /**
   * Set locations and generate flight paths
   */
  const setLocations = useCallback(async (newLocations: TravelLocation[]) => {
    setLocationsState(newLocations)
    await generateFlightPaths(newLocations)

    // Initialize engine if not already done
    initializeEngine()

    // Set timeline in engine
    if (animationEngineRef.current && newLocations.length > 0) {
      const timeline = newLocations.map((location, index) => ({
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

      animationEngineRef.current.setTimeline(timeline, timeline[0]?.year || new Date().getFullYear())
    }

    // Auto-play if enabled
    if (autoPlayEnabled && newLocations.length > 1) {
      play()
    }
  }, [generateFlightPaths, initializeEngine, autoPlayEnabled, play])

  /**
   * Pause flight animation
   */
  const pause = useCallback(() => {
    if (!animationEngineRef.current) return

    setIsPlaying(false)
    setIsPaused(true)

    animationEngineRef.current.pause()
  }, [])

  /**
   * Stop and reset flight animation
   */
  const stop = useCallback(() => {
    if (!animationEngineRef.current) return

    setIsPlaying(false)
    setIsPaused(false)

    animationEngineRef.current.pause()
    animationEngineRef.current.reset()

    setCurrentFlightState(null)
    setCameraPosition(null)
    setDestinationCameraPosition(null)
    setProgress(prev => ({
      ...prev,
      currentSegment: 0,
      segmentProgress: 0,
      overallProgress: 0,
      estimatedTimeRemaining: 0
    }))
  }, [])

  /**
   * Reset animation to beginning
   */
  const reset = useCallback(() => {
    stop()

    if (locations.length > 0) {
      setProgress(prev => ({
        ...prev,
        currentLocation: locations[0] || null,
        nextLocation: locations[1] || null
      }))
    }
  }, [stop, locations])

  /**
   * Set animation speed
   */
  const setSpeed = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(0.1, Math.min(5, newSpeed))
    setSpeedState(clampedSpeed)

    if (animationEngineRef.current) {
      animationEngineRef.current.setSpeed(clampedSpeed)
    }
  }, [])

  /**
   * Seek to specific segment
   */
  const seekToSegment = useCallback((segment: number) => {
    if (!animationEngineRef.current || segment < 0 || segment >= flightPaths.length) return

    animationEngineRef.current.seekToSegment(segment)

    setProgress(prev => ({
      ...prev,
      currentSegment: segment,
      currentLocation: locations[segment] || null,
      nextLocation: locations[segment + 1] || null
    }))
  }, [flightPaths.length, locations])

  /**
   * Seek to specific progress percentage
   */
  const seekToProgress = useCallback((progressPercent: number) => {
    const clampedProgress = Math.max(0, Math.min(100, progressPercent))
    const targetSegment = Math.floor((clampedProgress / 100) * Math.max(0, flightPaths.length - 1))
    seekToSegment(targetSegment)
  }, [flightPaths.length, seekToSegment])

  /**
   * Set auto-play mode
   */
  const setAutoPlay = useCallback((enabled: boolean) => {
    setAutoPlayEnabled(enabled)
  }, [])

  /**
   * Set camera follow mode
   */
  const setCameraFollow = useCallback((follow: boolean) => {
    setCameraFollowEnabled(follow)
    if (!follow) {
      setCameraPosition(null)
    }
  }, [])

  /**
   * Calculate total animation duration
   */
  const totalDuration = flightPaths.reduce((total, path) => total + path.duration, 0)

  /**
   * Update progress from animation engine
   */
  useEffect(() => {
    if (!isPlaying || !animationEngineRef.current) return

    const updateProgress = () => {
      if (!animationEngineRef.current) return

      const engineProgress = animationEngineRef.current.getProgress()
      const currentLocation = locations[engineProgress.segment] || null
      const nextLocation = locations[engineProgress.segment + 1] || null

      setProgress({
        currentSegment: engineProgress.segment,
        totalSegments: engineProgress.total,
        segmentProgress: engineProgress.percentage - (engineProgress.segment / engineProgress.total) * 100,
        overallProgress: engineProgress.percentage,
        currentLocation,
        nextLocation,
        estimatedTimeRemaining: (totalDuration * (1 - engineProgress.percentage / 100)) / speed
      })

      if (engineProgress.percentage >= 100) {
        setIsPlaying(false)
        setIsPaused(false)
        onAnimationComplete?.()
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress)
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateProgress)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, locations, totalDuration, speed, onAnimationComplete])

  /**
   * Cleanup animation engine on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }

      // Stop and cleanup animation engine
      if (animationEngineRef.current) {
        animationEngineRef.current.pause()
        animationEngineRef.current.reset()
        // Clear the engine reference
        animationEngineRef.current = null
      }
    }
  }, [])

  return {
    // Animation state
    isPlaying,
    isPaused,
    isLoading,
    error,

    // Flight data
    flightPaths,
    currentFlightState,
    progress,
    cameraPosition,
    destinationCameraPosition,

    // Controls
    play,
    pause,
    stop,
    reset,
    setSpeed,
    setLocations,
    seekToSegment,
    seekToProgress,

    // Configuration
    speed,
    totalDuration,
    setAutoPlay,
    setCameraFollow
  }
}

export type {
  FlightAnimationState,
  FlightProgress,
  CameraPosition,
  UseFlightAnimationOptions,
  UseFlightAnimationReturn
}