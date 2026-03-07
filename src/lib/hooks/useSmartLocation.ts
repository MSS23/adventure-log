import { useState, useCallback } from 'react'
import { autoPopulateLocation, extractLocationFromPhoto, LocationData } from '@/lib/services/smartLocations'
import { log } from '@/lib/utils/logger'
import { toast } from 'sonner'

export function useSmartLocation() {
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionProgress, setDetectionProgress] = useState(0)

  /**
   * Auto-detect location from uploaded photos
   */
  const detectLocationFromPhotos = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return null
    }

    setIsDetecting(true)
    setDetectionProgress(0)

    try {
      log.info('Starting smart location detection', {
        component: 'useSmartLocation',
        action: 'detectLocationFromPhotos',
        photoCount: files.length
      })

      // Process photos with progress updates
      const location = await autoPopulateLocation(files)

      if (location) {
        setLocationData(location)
        setDetectionProgress(100)

        toast.success(`Location detected: ${location.locationName}`, {
          description: `Automatically tagged from ${files.length} ${files.length === 1 ? 'photo' : 'photos'}`,
          duration: 4000
        })

        log.info('Smart location detected successfully', {
          component: 'useSmartLocation',
          action: 'detectLocationFromPhotos',
          locationName: location.locationName,
          confidence: location.confidence
        })

        return location
      } else {
        setDetectionProgress(100)
        log.info('No location data found in photos', {
          component: 'useSmartLocation',
          action: 'detectLocationFromPhotos'
        })
        return null
      }
    } catch (error) {
      log.error('Error detecting location from photos', {
        component: 'useSmartLocation',
        action: 'detectLocationFromPhotos'
      }, error as Error)
      toast.error('Could not detect location from photos')
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [])

  /**
   * Clear detected location
   */
  const clearLocation = useCallback(() => {
    setLocationData(null)
    setDetectionProgress(0)
  }, [])

  /**
   * Manually set location
   */
  const setLocation = useCallback((location: LocationData) => {
    setLocationData(location)
    setDetectionProgress(100)
  }, [])

  return {
    locationData,
    isDetecting,
    detectionProgress,
    detectLocationFromPhotos,
    clearLocation,
    setLocation
  }
}
