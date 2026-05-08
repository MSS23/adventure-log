'use client'

import { useRef, useCallback } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { TravelLocation } from '@/lib/hooks/useTravelTimeline'

export interface UseGlobeCameraReturn {
  interpolateLongitude: (start: number, end: number, progress: number) => number
  calculateOptimalCameraPosition: (locations: TravelLocation[]) => { lat: number; lng: number; altitude: number }
  animateCameraToPosition: (targetPOV: { lat: number; lng: number; altitude: number }, duration?: number, easing?: string) => void
  cameraAnimationRef: React.MutableRefObject<number | null>
}

export function useGlobeCamera(
  globeRef: React.MutableRefObject<GlobeMethods | undefined>
): UseGlobeCameraReturn {
  const cameraAnimationRef = useRef<number | null>(null)

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

    // Calculate appropriate altitude based on span
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
  }, [globeRef, interpolateLongitude])

  return {
    interpolateLongitude,
    calculateOptimalCameraPosition,
    animateCameraToPosition,
    cameraAnimationRef
  }
}
