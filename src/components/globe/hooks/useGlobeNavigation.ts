'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { TravelLocation, Album } from '@/lib/hooks/useTravelTimeline'
import type { CityCluster } from '../CityPinSystem'
import { log } from '@/lib/utils/logger'

interface ChronologicalAlbum {
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
}

export interface UseGlobeNavigationReturn {
  chronologicalAlbums: ChronologicalAlbum[]
  currentAlbumIndex: number
  setCurrentAlbumIndex: (index: number) => void
  currentAlbum: ChronologicalAlbum | null
  navigateToNextAlbum: () => void
  navigateToPreviousAlbum: () => void
  showCurrentAlbum: () => void
  navigateToNextAlbumRef: React.MutableRefObject<() => void>
  navigateToPreviousAlbumRef: React.MutableRefObject<() => void>
  showCurrentAlbumRef: React.MutableRefObject<() => void>
  currentAlbumRef: React.MutableRefObject<ChronologicalAlbum | null>
  chronologicalAlbumsRef: React.MutableRefObject<ChronologicalAlbum[]>
}

export function useGlobeNavigation(
  globeRef: React.MutableRefObject<GlobeMethods | undefined>,
  availableYears: number[],
  getYearData: (year: number) => { locations: TravelLocation[]; totalLocations: number } | null,
  animateCameraToPosition: (targetPOV: { lat: number; lng: number; altitude: number }, duration?: number, easing?: string) => void,
  setActiveCityId: (id: string | null) => void,
  setSelectedCluster: (cluster: CityCluster | null) => void,
  setShowAlbumModal: (show: boolean) => void
): UseGlobeNavigationReturn {
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0)

  // Create chronological album timeline across all years
  const chronologicalAlbums = useMemo(() => {
    const allAlbums: ChronologicalAlbum[] = []

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
              chronologicalIndex: 0,
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

    allAlbums.sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())

    allAlbums.forEach((album, index) => {
      album.chronologicalIndex = index
    })

    return allAlbums
  }, [availableYears, getYearData])

  const currentAlbum = chronologicalAlbums[currentAlbumIndex] || null

  // Album navigation functions
  const navigateToNextAlbum = useCallback(() => {
    if (currentAlbumIndex < chronologicalAlbums.length - 1) {
      const newIndex = currentAlbumIndex + 1
      const nextAlbum = chronologicalAlbums[newIndex]

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

      requestAnimationFrame(() => {
        setCurrentAlbumIndex(newIndex)
        setActiveCityId(nextAlbum.locationId)
        setSelectedCluster(cluster)
        setShowAlbumModal(true)

        if (globeRef.current) {
          animateCameraToPosition({
            lat: nextAlbum.latitude,
            lng: nextAlbum.longitude,
            altitude: 2.8
          }, 1200, 'easeInOutCubic')
        }
      })
    }
  }, [currentAlbumIndex, chronologicalAlbums, animateCameraToPosition, globeRef, setActiveCityId, setSelectedCluster, setShowAlbumModal])

  const navigateToPreviousAlbum = useCallback(() => {
    if (currentAlbumIndex > 0) {
      const newIndex = currentAlbumIndex - 1
      const prevAlbum = chronologicalAlbums[newIndex]

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

      requestAnimationFrame(() => {
        setCurrentAlbumIndex(newIndex)
        setActiveCityId(prevAlbum.locationId)
        setSelectedCluster(cluster)
        setShowAlbumModal(true)

        if (globeRef.current) {
          animateCameraToPosition({
            lat: prevAlbum.latitude,
            lng: prevAlbum.longitude,
            altitude: 2.8
          }, 1200, 'easeInOutCubic')
        }
      })
    }
  }, [currentAlbumIndex, chronologicalAlbums, animateCameraToPosition, globeRef, setActiveCityId, setSelectedCluster, setShowAlbumModal])

  const showCurrentAlbum = useCallback(() => {
    if (currentAlbum) {
      setActiveCityId(currentAlbum.locationId)

      if (globeRef.current) {
        animateCameraToPosition({
          lat: currentAlbum.latitude,
          lng: currentAlbum.longitude,
          altitude: 2.8
        }, 1200, 'easeInOutCubic')
      }

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
  }, [currentAlbum, animateCameraToPosition, globeRef, setActiveCityId, setSelectedCluster, setShowAlbumModal])

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

  return {
    chronologicalAlbums,
    currentAlbumIndex,
    setCurrentAlbumIndex,
    currentAlbum,
    navigateToNextAlbum,
    navigateToPreviousAlbum,
    showCurrentAlbum,
    navigateToNextAlbumRef,
    navigateToPreviousAlbumRef,
    showCurrentAlbumRef,
    currentAlbumRef,
    chronologicalAlbumsRef
  }
}
