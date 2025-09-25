'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

interface AlbumLocationInfo {
  id: string
  title: string
  hasCoordinates: boolean
  latitude: number | null
  longitude: number | null
  locationName: string | null
  countryCode: string | null
  photoCount: number
  createdAt: string
  photoUrls: string[]
  albumUrl: string
}

interface LocationDataStats {
  totalAlbums: number
  albumsWithLocation: number
  albumsWithoutLocation: number
  percentageWithLocation: number
  recentAlbumsWithoutLocation: AlbumLocationInfo[]
  albumsWithLocation: AlbumLocationInfo[]
  albumsWithoutLocation: AlbumLocationInfo[]
}

interface UseAlbumLocationDataReturn {
  stats: LocationDataStats | null
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  getAlbumsByLocationStatus: (hasLocation: boolean) => AlbumLocationInfo[]
}

export function useAlbumLocationData(): UseAlbumLocationDataReturn {
  const { user } = useAuth()
  const [stats, setStats] = useState<LocationDataStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchAlbumLocationData = useCallback(async () => {
    if (!user?.id) {
      setStats(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)

      // Fetch all user albums with their location data and photo info
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          latitude,
          longitude,
          location_name,
          country_code,
          created_at,
          cover_photo_url,
          photos(
            id,
            file_path,
            url:file_path
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (albumsError) throw albumsError

      const albums: AlbumLocationInfo[] = (albumsData || []).map((album) => {
        const hasCoordinates = album.latitude !== null && album.longitude !== null

        // Get up to 3 photo URLs for preview
        const photoUrls = album.photos
          ?.slice(0, 3)
          ?.map((photo: { url: string }) => {
            // Convert storage path to full URL if needed
            const url = photo.url
            if (url?.startsWith('http')) {
              return url
            } else if (url) {
              // Construct Supabase storage URL
              const { data } = supabase.storage.from('photos').getPublicUrl(url)
              return data.publicUrl
            }
            return album.cover_photo_url || '/placeholder-image.jpg'
          }) || []

        return {
          id: album.id,
          title: album.title,
          hasCoordinates,
          latitude: album.latitude,
          longitude: album.longitude,
          locationName: album.location_name,
          countryCode: album.country_code,
          photoCount: album.photos?.length || 0,
          createdAt: album.created_at,
          photoUrls,
          albumUrl: `/albums/${album.id}`
        }
      })

      const totalAlbums = albums.length
      const albumsWithLocation = albums.filter(album => album.hasCoordinates)
      const albumsWithoutLocation = albums.filter(album => !album.hasCoordinates)

      const albumsWithLocationCount = albumsWithLocation.length
      const albumsWithoutLocationCount = albumsWithoutLocation.length
      const percentageWithLocation = totalAlbums > 0
        ? Math.round((albumsWithLocationCount / totalAlbums) * 100)
        : 0

      // Get most recent albums without location (limit to 5 for UI)
      const recentAlbumsWithoutLocation = albumsWithoutLocation
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

      const locationStats: LocationDataStats = {
        totalAlbums,
        albumsWithLocation: albumsWithLocationCount,
        albumsWithoutLocation: albumsWithoutLocationCount,
        percentageWithLocation,
        recentAlbumsWithoutLocation,
        albumsWithLocation,
        albumsWithoutLocation
      }

      setStats(locationStats)

      log.info('Album location data loaded', {
        component: 'useAlbumLocationData',
        totalAlbums,
        withLocation: albumsWithLocationCount,
        withoutLocation: albumsWithoutLocationCount,
        percentage: percentageWithLocation
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load album location data'
      setError(errorMessage)
      log.error('Error fetching album location data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  const refreshData = useCallback(async () => {
    await fetchAlbumLocationData()
  }, [fetchAlbumLocationData])

  const getAlbumsByLocationStatus = useCallback((hasLocation: boolean): AlbumLocationInfo[] => {
    if (!stats) return []
    return hasLocation ? stats.albumsWithLocation : stats.albumsWithoutLocation
  }, [stats])

  // Load data when user changes
  useEffect(() => {
    if (user?.id) {
      fetchAlbumLocationData()
    } else {
      setStats(null)
      setLoading(false)
      setError(null)
    }
  }, [user?.id, fetchAlbumLocationData])

  // Real-time subscription for album changes
  useEffect(() => {
    if (!user?.id) return

    const albumsSubscription = supabase
      .channel('album-location-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'albums',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          log.info('Album changed, refreshing location data', {
            component: 'useAlbumLocationData',
            event: payload.eventType,
            albumId: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
          })

          // Refresh data when albums change
          await refreshData()
        }
      )
      .subscribe()

    return () => {
      albumsSubscription.unsubscribe()
    }
  }, [user?.id, refreshData, supabase])

  return {
    stats,
    loading,
    error,
    refreshData,
    getAlbumsByLocationStatus
  }
}

export type { AlbumLocationInfo, LocationDataStats, UseAlbumLocationDataReturn }