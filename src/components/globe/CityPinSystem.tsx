'use client'

import { useMemo, useCallback } from 'react'
import type { GlobeHtmlElement } from '@/types/globe'

export interface CityPin {
  id: string
  name: string
  latitude: number
  longitude: number
  albumCount: number
  photoCount: number
  visitDate: string
  isVisited: boolean
  isActive: boolean
  favoritePhotoUrls?: string[]
  coverPhotoUrl?: string
  previewPhotoUrls?: string[] // First 5-8 photos for modal preview
}

export interface CityCluster {
  id: string
  latitude: number
  longitude: number
  cities: CityPin[]
  totalAlbums: number
  totalPhotos: number
  radius: number
}

/**
 * Zoom level buckets derived from camera altitude. Drives how aggressively
 * pins are clustered and whether they render as cheap count-badge dots.
 *  - 'far'  : world view — region/country level clustering, cheap dots
 *  - 'mid'  : continental/regional — moderate clustering
 *  - 'near' : close in — individual locations, full photo pins
 */
export type ClusterLevel = 'far' | 'mid' | 'near'

/**
 * Map a react-globe.gl camera altitude to a clustering radius (in degrees)
 * and a coarse zoom level. Far out -> large radius (merge aggressively);
 * close in -> tiny radius (decluster to individual locations).
 *
 * Altitude is the distance from the globe surface in globe-radius units.
 * Typical values: ~2.5+ world view, ~1.0-1.5 continental, <0.6 city level.
 */
export function clusterParamsForAltitude(altitude: number): {
  radiusDeg: number
  level: ClusterLevel
} {
  // Guard against NaN / undefined altitude (treat as world view).
  const alt = Number.isFinite(altitude) ? altitude : 2.5

  if (alt >= 1.8) {
    // World view: merge anything within ~14 degrees -> country/region pins.
    return { radiusDeg: 14, level: 'far' }
  }
  if (alt >= 1.0) {
    // Continental: merge within ~6 degrees.
    return { radiusDeg: 6, level: 'far' }
  }
  if (alt >= 0.55) {
    // Regional: merge within ~2 degrees.
    return { radiusDeg: 2, level: 'mid' }
  }
  if (alt >= 0.3) {
    // Metro: merge within ~0.6 degrees.
    return { radiusDeg: 0.6, level: 'mid' }
  }
  // Street/city level: essentially individual locations.
  return { radiusDeg: 0.15, level: 'near' }
}

interface CityPinSystemProps {
  cities: CityPin[]
  onCityClick: (city: CityPin) => void
  onClusterClick: (cluster: CityCluster) => void
  activeCity: string | null
  /** Zoom-aware clustering radius in degrees (see clusterParamsForAltitude). */
  radiusDeg: number
  /** Coarse zoom level bucket derived from camera altitude. */
  level: ClusterLevel
}

export interface CityPinSystemResult {
  clusters: CityCluster[]
  pinData: Array<{
    lat: number
    lng: number
    size: number
    color: string
    opacity: number
    cluster: CityCluster
    isMultiCity: boolean
    isActive: boolean
    isCheap: boolean
    clusterLevel: ClusterLevel
    label: string
    albumCount: number
    photoCount: number
  }>
  labelData: Array<{ lat: number; lng: number; text: string; size: number; color: string }>
  ringData: Array<{ lat: number; lng: number; maxR: number; propagationSpeed: number; repeatPeriod: number; color: string }>
  handlePinClick: (pinData: GlobeHtmlElement) => void
}

/**
 * Zoom-aware pin clustering as a memoized hook.
 *
 * IDENTITY MATTERS HERE: three-globe diffs `htmlElementsData` by object
 * identity, so every fresh `pinData` array tears down and rebuilds every
 * pin's DOM element. This used to be a plain function called on each render
 * of EnhancedGlobe — meaning any unrelated state change (modal open, rotation
 * toggle, flight tick) rebuilt the entire pin layer. Memoizing on the actual
 * inputs (cities, active pin, zoom band) keeps pin elements alive across
 * unrelated renders, which is the single biggest globe perf win on mobile.
 */
export function useCityPinSystem({
  cities,
  onCityClick,
  onClusterClick,
  activeCity,
  radiusDeg,
  level
}: CityPinSystemProps): CityPinSystemResult {
  const { clusters, pinData, labelData, ringData } = useMemo(() => {
    // At far zoom, clustered pins should render as cheap count-badge dots
    // (no photo thumbnails) for clarity and performance.
    const cheapPins = level === 'far'

    // Zoom-aware clustering: group cities within radiusDeg degrees of each other.
    const clusters: CityCluster[] = []
    const processedCities = new Set<string>()

    // Dedupe by id first. The timeline can surface the same album/location more
    // than once; without this, a single album appears as several duplicate
    // pills/photos in one popup (the "multiple popups for one album" bug).
    const uniqueCities = Array.from(new Map(cities.map(c => [c.id, c])).values())

    uniqueCities.forEach(city => {
      if (processedCities.has(city.id)) return
      // Skip cities with missing/NaN coordinates before any distance math —
      // these would produce NaN clusters or phantom pins at (0,0).
      if (!Number.isFinite(city.latitude) || !Number.isFinite(city.longitude)) return

      // Find nearby cities (within the current zoom-aware radius)
      const nearbyCities = uniqueCities.filter(c => {
        if (processedCities.has(c.id)) return false
        if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return false
        const distance = Math.sqrt(
          Math.pow(c.latitude - city.latitude, 2) +
          Math.pow(c.longitude - city.longitude, 2)
        )
        return distance < radiusDeg
      })

      nearbyCities.forEach(c => processedCities.add(c.id))

      clusters.push({
        id: nearbyCities.length > 1 ? `cluster-${city.id}` : city.id,
        latitude: nearbyCities.reduce((sum, c) => sum + c.latitude, 0) / nearbyCities.length,
        longitude: nearbyCities.reduce((sum, c) => sum + c.longitude, 0) / nearbyCities.length,
        cities: nearbyCities,
        totalAlbums: nearbyCities.reduce((sum, c) => sum + c.albumCount, 0),
        totalPhotos: nearbyCities.reduce((sum, c) => sum + c.photoCount, 0),
        radius: nearbyCities.length > 1 ? 2 : 1
      })
    })

    // Create pin data for globe
    const pinData = clusters.map(cluster => ({
      lat: cluster.latitude,
      lng: cluster.longitude,
      size: cluster.radius,
      color: cluster.cities.some(c => c.isActive) ? '#ffd700' : '#D97706',
      opacity: 0.9,
      cluster: cluster,
      isMultiCity: cluster.cities.length > 1,
      isActive: cluster.cities.some(c => c.id === activeCity),
      // At far zoom render lightweight count-badge dots instead of photo pins.
      // Keep individual (single-city) pins as full pins even at far zoom so a
      // lone location still reads as a place, not an anonymous dot.
      isCheap: cheapPins && cluster.cities.length > 1,
      clusterLevel: level,
      label: cluster.cities.length > 1 ? `${cluster.cities.length} locations` : cluster.cities[0].name,
      albumCount: cluster.totalAlbums,
      photoCount: cluster.totalPhotos
    }))

    // Create label data
    const labelData = clusters.map(cluster => ({
      lat: cluster.latitude,
      lng: cluster.longitude,
      text: cluster.cities.length > 1 ? `${cluster.cities.length}` : cluster.cities[0].name,
      size: cluster.cities.length > 1 ? 2 : 1.5,
      color: '#ffffff'
    }))

    // Create ring data for active cities
    const ringData = clusters
      .filter(cluster => cluster.cities.some(c => c.id === activeCity))
      .map(cluster => ({
        lat: cluster.latitude,
        lng: cluster.longitude,
        maxR: 5,
        propagationSpeed: 2,
        repeatPeriod: 1500,
        color: '#ffd700'
      }))

    return { clusters, pinData, labelData, ringData }
  }, [cities, activeCity, radiusDeg, level])

  const handlePinClick = useCallback((pinData: GlobeHtmlElement) => {
    const cluster = pinData.cluster
    if (cluster.cities.length === 1) {
      onCityClick(cluster.cities[0])
    } else {
      onClusterClick(cluster)
    }
  }, [onCityClick, onClusterClick])

  return useMemo(
    () => ({ clusters, pinData, labelData, ringData, handlePinClick }),
    [clusters, pinData, labelData, ringData, handlePinClick]
  )
}

export function formatPinTooltip(cluster: CityCluster): string {
  if (cluster.cities.length === 1) {
    const city = cluster.cities[0]
    // Extract just the location name (before comma) to avoid "Tuscany, IT" format
    const locationName = city.name.split(',')[0].trim()
    return `${locationName}\n${city.albumCount} album${city.albumCount !== 1 ? 's' : ''} • ${city.photoCount} photo${city.photoCount !== 1 ? 's' : ''}`
  }
  return `${cluster.cities.length} cities\n${cluster.totalAlbums} albums • ${cluster.totalPhotos} photos`
}
