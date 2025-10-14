'use client'

import { useState, useEffect, useCallback } from 'react'
import { log } from '@/lib/utils/logger'

export interface CurrentLocation {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

export interface UseCurrentLocationReturn {
  location: CurrentLocation | null
  loading: boolean
  error: string | null
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported' | null
  requestLocation: () => Promise<void>
  clearLocation: () => void
}

export function useCurrentLocation(autoRequest: boolean = false): UseCurrentLocationReturn {
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported' | null>(null)

  // Check if geolocation is supported
  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator

  // Check permission status
  const checkPermissionStatus = useCallback(async () => {
    if (!isSupported) {
      setPermissionStatus('unsupported')
      return
    }

    // Check if Permissions API is available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')

        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')
        })
      } catch (err) {
        // Permissions API might not be fully supported, fallback to 'prompt'
        setPermissionStatus('prompt')
        log.warn('Permissions API not fully supported', { error: err })
      }
    } else {
      // Permissions API not available, assume 'prompt'
      setPermissionStatus('prompt')
    }
  }, [isSupported])

  // Request current location
  const requestLocation = useCallback(async () => {
    if (!isSupported) {
      setError('Geolocation is not supported by your browser')
      log.error('Geolocation not supported', { component: 'useCurrentLocation' })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Cache for 1 minute
        })
      })

      const currentLocation: CurrentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      }

      setLocation(currentLocation)
      setPermissionStatus('granted')

      log.info('Current location detected', {
        component: 'useCurrentLocation',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy
      })

    } catch (err) {
      const error = err as GeolocationPositionError
      let errorMessage = 'Failed to get your location'

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access in your browser settings.'
          setPermissionStatus('denied')
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.'
          break
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again.'
          break
        default:
          errorMessage = error.message || 'Unknown error occurred'
      }

      setError(errorMessage)
      log.error('Failed to get current location', {
        component: 'useCurrentLocation',
        error: errorMessage,
        code: error.code
      })
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  // Clear location
  const clearLocation = useCallback(() => {
    setLocation(null)
    setError(null)
  }, [])

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus()
  }, [checkPermissionStatus])

  // Auto-request location if enabled
  useEffect(() => {
    if (autoRequest && permissionStatus === 'granted') {
      requestLocation()
    }
  }, [autoRequest, permissionStatus, requestLocation])

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestLocation,
    clearLocation
  }
}
