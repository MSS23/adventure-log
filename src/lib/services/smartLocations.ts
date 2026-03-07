/**
 * Smart Locations Service
 * Automatic location tagging and intelligent organization of travel spots
 */

import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

export interface LocationData {
  latitude: number
  longitude: number
  locationName: string
  countryCode: string
  city?: string
  country?: string
  confidence: number
}

export interface SmartLocationSuggestion {
  id: string
  name: string
  latitude: number
  longitude: number
  countryCode: string
  frequency: number // How many times visited
  lastVisited: string
  albumCount: number
}

/**
 * Extract location from photo EXIF data
 */
export async function extractLocationFromPhoto(file: File): Promise<LocationData | null> {
  try {
    // Dynamic import to avoid bundling exifr in all pages
    const exifr = await import('exifr')

    const exifData = await exifr.parse(file, {
      gps: true,
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude']
    })

    if (!exifData || (!exifData.latitude && !exifData.GPSLatitude)) {
      return null
    }

    const latitude = exifData.latitude || exifData.GPSLatitude
    const longitude = exifData.longitude || exifData.GPSLongitude

    // Reverse geocode to get location name
    const locationInfo = await reverseGeocode(latitude, longitude)

    return {
      latitude,
      longitude,
      locationName: locationInfo.locationName,
      countryCode: locationInfo.countryCode,
      city: locationInfo.city,
      country: locationInfo.country,
      confidence: 1.0 // High confidence from GPS data
    }
  } catch (error) {
    log.error('Error extracting location from photo', {
      component: 'smartLocations',
      action: 'extractLocationFromPhoto'
    }, error as Error)
    return null
  }
}

/**
 * Extract locations from multiple photos and find the most common one
 */
export async function extractLocationsFromPhotos(files: File[]): Promise<LocationData | null> {
  try {
    const locations = await Promise.all(
      files.map(file => extractLocationFromPhoto(file))
    )

    const validLocations = locations.filter((loc): loc is LocationData => loc !== null)

    if (validLocations.length === 0) {
      return null
    }

    // If all photos are from the same general location, use that
    if (validLocations.length === 1) {
      return validLocations[0]
    }

    // Find the most common location (cluster nearby coordinates)
    const clustered = clusterLocations(validLocations)
    return clustered
  } catch (error) {
    log.error('Error extracting locations from photos', {
      component: 'smartLocations',
      action: 'extractLocationsFromPhotos'
    }, error as Error)
    return null
  }
}

/**
 * Cluster nearby locations and return the centroid
 */
function clusterLocations(locations: LocationData[]): LocationData {
  // Calculate average (centroid) of all locations
  const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length
  const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length

  // Use the most common location name
  const locationNames = locations.map(l => l.locationName)
  const mostCommon = locationNames.reduce((a, b, _, arr) =>
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  )

  // Use the most common country code
  const countryCodes = locations.map(l => l.countryCode)
  const mostCommonCountry = countryCodes.reduce((a, b, _, arr) =>
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  )

  return {
    latitude: avgLat,
    longitude: avgLng,
    locationName: mostCommon,
    countryCode: mostCommonCountry,
    confidence: 0.8 // Slightly lower confidence for clustered data
  }
}

/**
 * Reverse geocode coordinates to location name
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<{
  locationName: string
  countryCode: string
  city?: string
  country?: string
}> {
  try {
    // Use Nominatim (OpenStreetMap) reverse geocoding - free and no API key needed
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
      {
        headers: {
          'User-Agent': 'AdventureLog/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding failed')
    }

    const data = await response.json()
    const address = data.address || {}

    const city = address.city || address.town || address.village || address.county
    const country = address.country
    const countryCode = address.country_code?.toUpperCase() || 'XX'

    const locationName = city && country
      ? `${city}, ${country}`
      : country || 'Unknown Location'

    return {
      locationName,
      countryCode,
      city,
      country
    }
  } catch (error) {
    log.error('Error reverse geocoding', {
      component: 'smartLocations',
      action: 'reverseGeocode',
      latitude,
      longitude
    }, error as Error)

    return {
      locationName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      countryCode: 'XX'
    }
  }
}

/**
 * Get smart location suggestions based on user's history
 */
export async function getLocationSuggestions(userId: string): Promise<SmartLocationSuggestion[]> {
  try {
    const supabase = createClient()

    // Fetch user's albums with location data
    const { data: albums, error } = await supabase
      .from('albums')
      .select('id, location_name, country_code, latitude, longitude, created_at')
      .eq('user_id', userId)
      .not('location_name', 'is', null)
      .not('country_code', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by location name and count frequency
    const locationMap = new Map<string, {
      name: string
      latitude: number
      longitude: number
      countryCode: string
      frequency: number
      lastVisited: string
      albumIds: string[]
    }>()

    albums?.forEach(album => {
      const key = album.location_name!
      const existing = locationMap.get(key)

      if (existing) {
        existing.frequency++
        existing.albumIds.push(album.id)
        if (new Date(album.created_at) > new Date(existing.lastVisited)) {
          existing.lastVisited = album.created_at
        }
      } else {
        locationMap.set(key, {
          name: album.location_name!,
          latitude: album.latitude || 0,
          longitude: album.longitude || 0,
          countryCode: album.country_code!,
          frequency: 1,
          lastVisited: album.created_at,
          albumIds: [album.id]
        })
      }
    })

    // Convert to array and sort by frequency (most visited first)
    const suggestions: SmartLocationSuggestion[] = Array.from(locationMap.values())
      .map(loc => ({
        id: loc.albumIds[0], // Use first album ID as identifier
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        countryCode: loc.countryCode,
        frequency: loc.frequency,
        lastVisited: loc.lastVisited,
        albumCount: loc.albumIds.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Top 10 most visited locations

    return suggestions
  } catch (error) {
    log.error('Error getting location suggestions', {
      component: 'smartLocations',
      action: 'getLocationSuggestions',
      userId
    }, error as Error)
    return []
  }
}

/**
 * Suggest location based on nearby albums
 */
export async function suggestNearbyLocation(
  latitude: number,
  longitude: number,
  userId: string
): Promise<string | null> {
  try {
    const supabase = createClient()

    // Find albums within ~50km radius (approximate)
    const latRange = 0.5 // ~55km
    const lngRange = 0.5

    const { data: nearbyAlbums, error } = await supabase
      .from('albums')
      .select('location_name, latitude, longitude')
      .eq('user_id', userId)
      .not('location_name', 'is', null)
      .gte('latitude', latitude - latRange)
      .lte('latitude', latitude + latRange)
      .gte('longitude', longitude - lngRange)
      .lte('longitude', longitude + lngRange)
      .limit(5)

    if (error) throw error

    if (nearbyAlbums && nearbyAlbums.length > 0) {
      // Return the closest one
      const closest = nearbyAlbums.reduce((prev, curr) => {
        const prevDist = Math.sqrt(
          Math.pow((prev.latitude || 0) - latitude, 2) +
          Math.pow((prev.longitude || 0) - longitude, 2)
        )
        const currDist = Math.sqrt(
          Math.pow((curr.latitude || 0) - latitude, 2) +
          Math.pow((curr.longitude || 0) - longitude, 2)
        )
        return currDist < prevDist ? curr : prev
      })

      return closest.location_name
    }

    return null
  } catch (error) {
    log.error('Error suggesting nearby location', {
      component: 'smartLocations',
      action: 'suggestNearbyLocation'
    }, error as Error)
    return null
  }
}

/**
 * Auto-populate location from photos during upload
 */
export async function autoPopulateLocation(photos: File[]): Promise<LocationData | null> {
  log.info('Auto-populating location from photos', {
    component: 'smartLocations',
    action: 'autoPopulateLocation',
    photoCount: photos.length
  })

  const location = await extractLocationsFromPhotos(photos)

  if (location) {
    log.info('Location auto-populated successfully', {
      component: 'smartLocations',
      action: 'autoPopulateLocation',
      locationName: location.locationName,
      confidence: location.confidence
    })
  }

  return location
}
