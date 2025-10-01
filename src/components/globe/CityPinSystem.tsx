'use client'

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

interface CityPinSystemProps {
  cities: CityPin[]
  onCityClick: (city: CityPin) => void
  onClusterClick: (cluster: CityCluster) => void
  activeCity: string | null
}

export function CityPinSystem({
  cities,
  onCityClick,
  onClusterClick,
  activeCity
}: CityPinSystemProps) {
  // Simple clustering: group cities that are very close together
  const clusters: CityCluster[] = []
  const processedCities = new Set<string>()

  cities.forEach(city => {
    if (processedCities.has(city.id)) return

    // Find nearby cities (within 0.5 degrees)
    const nearbyCities = cities.filter(c => {
      if (processedCities.has(c.id)) return false
      const distance = Math.sqrt(
        Math.pow(c.latitude - city.latitude, 2) +
        Math.pow(c.longitude - city.longitude, 2)
      )
      return distance < 0.5
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
    color: cluster.cities.some(c => c.isActive) ? '#ffd700' : '#3b82f6',
    opacity: 0.9,
    cluster: cluster,
    isMultiCity: cluster.cities.length > 1,
    isActive: cluster.cities.some(c => c.id === activeCity),
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

  const handlePinClick = (pinData: GlobeHtmlElement) => {
    const cluster = pinData.cluster
    if (cluster.cities.length === 1) {
      onCityClick(cluster.cities[0])
    } else {
      onClusterClick(cluster)
    }
  }

  return {
    clusters,
    pinData,
    labelData,
    ringData,
    handlePinClick
  }
}

export function formatPinTooltip(cluster: CityCluster): string {
  if (cluster.cities.length === 1) {
    const city = cluster.cities[0]
    return `${city.name}\n${city.albumCount} albums • ${city.photoCount} photos`
  }
  return `${cluster.cities.length} cities\n${cluster.totalAlbums} albums • ${cluster.totalPhotos} photos`
}
