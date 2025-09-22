'use client'

import { useMemo } from 'react'
import { GlobeHtmlElement, CityPin, CityCluster } from '@/types/globe'

interface CityPinSystemProps {
  cities: CityPin[]
  onCityClick?: (city: CityPin) => void
  onClusterClick?: (cluster: CityCluster) => void
  clusterDistance?: number
  activeCity?: string | null
}

const EARTH_RADIUS = 6371
const DEFAULT_CLUSTER_DISTANCE = 200
const MIN_PIN_SIZE = 0.8
const MAX_PIN_SIZE = 3.0

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
           Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS * c
}

function createClusters(cities: CityPin[], clusterDistance: number): CityCluster[] {
  if (cities.length === 0) return []

  const clusters: CityCluster[] = []
  const processed = new Set<string>()

  cities.forEach(city => {
    if (processed.has(city.id)) return

    const cluster: CityCluster = {
      id: `cluster-${city.id}`,
      latitude: city.latitude,
      longitude: city.longitude,
      cities: [city],
      totalAlbums: city.albumCount,
      totalPhotos: city.photoCount,
      radius: Math.max(MIN_PIN_SIZE, Math.min(MAX_PIN_SIZE, Math.sqrt(city.albumCount + city.photoCount) * 0.3))
    }

    processed.add(city.id)

    cities.forEach(otherCity => {
      if (processed.has(otherCity.id) || otherCity.id === city.id) return

      const distance = calculateDistance(
        city.latitude, city.longitude,
        otherCity.latitude, otherCity.longitude
      )

      if (distance <= clusterDistance) {
        cluster.cities.push(otherCity)
        cluster.totalAlbums += otherCity.albumCount
        cluster.totalPhotos += otherCity.photoCount
        processed.add(otherCity.id)

        const weightedLat = cluster.cities.reduce((sum, c) => {
          const weight = c.albumCount + c.photoCount + 1
          return sum + (c.latitude * weight)
        }, 0) / cluster.cities.reduce((sum, c) => sum + c.albumCount + c.photoCount + 1, 0)

        const weightedLng = cluster.cities.reduce((sum, c) => {
          const weight = c.albumCount + c.photoCount + 1
          return sum + (c.longitude * weight)
        }, 0) / cluster.cities.reduce((sum, c) => sum + c.albumCount + c.photoCount + 1, 0)

        cluster.latitude = weightedLat
        cluster.longitude = weightedLng
        cluster.radius = Math.max(
          MIN_PIN_SIZE,
          Math.min(MAX_PIN_SIZE, Math.sqrt(cluster.totalAlbums + cluster.totalPhotos) * 0.2)
        )
      }
    })

    clusters.push(cluster)
  })

  return clusters
}

export function CityPinSystem({
  cities,
  onCityClick,
  onClusterClick,
  clusterDistance = DEFAULT_CLUSTER_DISTANCE,
  activeCity
}: CityPinSystemProps) {

  const clusters = useMemo(() => {
    return createClusters(cities, clusterDistance)
  }, [cities, clusterDistance])

  const pinData = useMemo(() => {
    return clusters.map(cluster => {
      const isMultiCity = cluster.cities.length > 1
      const isActive = cluster.cities.some(city => city.id === activeCity)

      return {
        id: cluster.id,
        lat: cluster.latitude,
        lng: cluster.longitude,
        size: cluster.radius,
        color: isActive ? '#ff6b35' : (isMultiCity ? '#4f46e5' : '#06b6d4'),
        cluster: cluster,
        isMultiCity,
        isActive,
        label: isMultiCity
          ? `${cluster.cities.length} cities`
          : cluster.cities[0].name,
        albumCount: cluster.totalAlbums,
        photoCount: cluster.totalPhotos,
        opacity: isActive ? 1 : 0.8
      }
    })
  }, [clusters, activeCity])

  const labelData = useMemo(() => {
    return clusters
      .filter(cluster => cluster.totalAlbums > 0 || cluster.totalPhotos > 0)
      .map(cluster => {
        const isActive = cluster.cities.some(city => city.id === activeCity)
        const isMultiCity = cluster.cities.length > 1

        return {
          lat: cluster.latitude,
          lng: cluster.longitude + 2,
          text: isMultiCity
            ? `${cluster.cities.length} Cities`
            : cluster.cities[0].name,
          size: isActive ? 1.2 : 0.8,
          color: isActive ? '#ff6b35' : '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 3,
          padding: 2
        }
      })
  }, [clusters, activeCity])

  const ringData = useMemo(() => {
    return clusters
      .filter(cluster => cluster.cities.some(city => city.id === activeCity))
      .map(cluster => ({
        lat: cluster.latitude,
        lng: cluster.longitude,
        maxR: cluster.radius * 2,
        propagationSpeed: 4,
        repeatPeriod: 2000,
        color: '#ff6b35'
      }))
  }, [clusters, activeCity])

  const handlePinClick = (pointData: GlobeHtmlElement) => {
    const cluster = pointData.cluster as CityCluster

    if (cluster.cities.length === 1) {
      onCityClick?.(cluster.cities[0])
    } else {
      onClusterClick?.(cluster)
    }
  }

  return {
    pinData,
    labelData,
    ringData,
    handlePinClick,
    clusters
  }
}

export function formatPinTooltip(cluster: CityCluster): string {
  if (cluster.cities.length === 1) {
    const city = cluster.cities[0]
    return `
      <div style="
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-family: system-ui;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 200px;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${city.name}</h3>
        <div style="font-size: 14px; opacity: 0.9;">
          <div style="margin-bottom: 4px;">📅 ${new Date(city.visitDate).toLocaleDateString()}</div>
          <div style="margin-bottom: 4px;">📸 ${city.albumCount} albums</div>
          <div style="margin-bottom: 4px;">🖼️ ${city.photoCount} photos</div>
        </div>
      </div>
    `
  } else {
    return `
      <div style="
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-family: system-ui;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 250px;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${cluster.cities.length} Cities Cluster
        </h3>
        <div style="font-size: 14px; opacity: 0.9;">
          <div style="margin-bottom: 4px;">📸 ${cluster.totalAlbums} total albums</div>
          <div style="margin-bottom: 8px;">🖼️ ${cluster.totalPhotos} total photos</div>
          <div style="font-size: 12px; opacity: 0.7;">
            Cities: ${cluster.cities.map(c => c.name).slice(0, 3).join(', ')}
            ${cluster.cities.length > 3 ? ` +${cluster.cities.length - 3} more` : ''}
          </div>
        </div>
      </div>
    `
  }
}

export { type CityPin, type CityCluster }