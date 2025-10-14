/**
 * Capacitor Geolocation Integration
 *
 * Unified geolocation interface for getting current location
 */

import { Geolocation, Position } from '@capacitor/geolocation'
import { Toast } from '@capacitor/toast'
import { Capacitor } from '@capacitor/core'
import { log } from '@/lib/utils/logger'

export interface LocationData {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

/**
 * Check if running in native app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check location permissions
 */
export async function checkLocationPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    return true // Web uses browser permissions
  }

  try {
    const permissions = await Geolocation.checkPermissions()
    return permissions.location === 'granted' || permissions.coarseLocation === 'granted'
  } catch (error) {
    log.error('Error checking location permissions', { error })
    return false
  }
}

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    return true
  }

  try {
    const permissions = await Geolocation.requestPermissions()
    return permissions.location === 'granted' || permissions.coarseLocation === 'granted'
  } catch (error) {
    log.error('Error requesting location permissions', { error })
    return false
  }
}

/**
 * Get current position
 */
export async function getCurrentLocation(
  options: {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
  } = {}
): Promise<LocationData | null> {
  const hasPermission = await checkLocationPermissions()

  if (!hasPermission) {
    const granted = await requestLocationPermissions()
    if (!granted) {
      await Toast.show({
        text: 'Location permission is required',
        duration: 'long',
        position: 'bottom'
      })
      return null
    }
  }

  try {
    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 0
    })

    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? undefined,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      timestamp: position.timestamp
    }

    log.info('Location obtained', {
      component: 'geolocation',
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy
    })

    return locationData
  } catch (error) {
    log.error('Error getting current location', { error })
    await Toast.show({
      text: 'Failed to get current location',
      duration: 'short',
      position: 'bottom'
    })
    return null
  }
}

/**
 * Watch position with continuous updates
 */
export function watchPosition(
  callback: (position: LocationData) => void,
  options: {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
  } = {}
): string | null {
  let watchId: string | null = null

  Geolocation.watchPosition(
    {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 5000
    },
    (position, err) => {
      if (err) {
        log.error('Error watching position', { error: err })
        return
      }

      if (position) {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? undefined,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: position.timestamp
        }

        callback(locationData)
      }
    }
  ).then(id => {
    watchId = id
  })

  return watchId
}

/**
 * Clear position watch
 */
export async function clearWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId })
  } catch (error) {
    log.error('Error clearing position watch', { error, watchId })
  }
}

/**
 * Format location for display
 */
export function formatLocation(location: LocationData): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

/**
 * Calculate distance between two points (in meters) using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
