'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSupabaseRPC, useSupabaseTable } from './useSupabaseQuery'
import { log } from '@/lib/utils/logger'

export interface DashboardStats {
  totalAlbums: number
  totalPhotos: number
  countriesVisited: number
  citiesExplored: number
}

export interface AlbumStats extends DashboardStats {
  publicAlbums: number
  privateAlbums: number
  friendsAlbums: number
}

/**
 * Centralized hook for dashboard statistics
 * Uses RPC function with fallback to individual queries for reliability
 */
export function useDashboardStats() {
  const { user } = useAuth()

  // Primary approach: Use optimized RPC function
  const rpcStats = useSupabaseRPC<DashboardStats>(
    'get_user_dashboard_stats',
    { user_id_param: user?.id },
    {
      component: 'useDashboardStats',
      action: 'fetch-rpc-stats',
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 minutes - stats don't change frequently
    }
  )

  // Fallback approach: Individual queries
  const albumsQuery = useSupabaseTable(
    'albums',
    {
      select: 'id, country_id, city_id',
      filters: { user_id: user?.id },
      component: 'useDashboardStats',
      action: 'fetch-albums-fallback',
      enabled: !!user?.id && !!rpcStats.error, // Only run if RPC fails
      staleTime: 2 * 60 * 1000,
    }
  )

  const photosQuery = useSupabaseTable(
    'photos',
    {
      select: 'id',
      filters: { user_id: user?.id },
      component: 'useDashboardStats',
      action: 'fetch-photos-fallback',
      enabled: !!user?.id && !!rpcStats.error, // Only run if RPC fails
      staleTime: 2 * 60 * 1000,
    }
  )

  // Compute fallback stats when needed
  const fallbackStats = useMemo<DashboardStats>(() => {
    if (!albumsQuery.data || !photosQuery.data) {
      return {
        totalAlbums: 0,
        totalPhotos: 0,
        countriesVisited: 0,
        citiesExplored: 0
      }
    }

    const albums = (albumsQuery.data as Array<{id: string, country_id?: number, city_id?: number}>) || []
    const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id))
    const uniqueCities = new Set(albums.filter(a => a.city_id).map(a => a.city_id))

    const stats = {
      totalAlbums: albums.length,
      totalPhotos: Array.isArray(photosQuery.data) ? photosQuery.data.length : 0,
      countriesVisited: uniqueCountries.size,
      citiesExplored: uniqueCities.size
    }

    log.info('Fallback stats computed', {
      component: 'useDashboardStats',
      action: 'compute-fallback-stats',
      stats
    })

    return stats
  }, [albumsQuery.data, photosQuery.data])

  // Determine which stats to use
  const stats = rpcStats.error ? fallbackStats : (rpcStats.data || {
    totalAlbums: 0,
    totalPhotos: 0,
    countriesVisited: 0,
    citiesExplored: 0
  })

  // Loading state: RPC loading OR fallback queries loading
  const loading = rpcStats.loading || (rpcStats.error && (albumsQuery.loading || photosQuery.loading))

  // Error state: both RPC and fallback failed
  const error = rpcStats.error && albumsQuery.error ?
    (albumsQuery.error || photosQuery.error || rpcStats.error) :
    null

  // Initialized state: either RPC succeeded or fallback completed
  const initialized = rpcStats.initialized && !rpcStats.error ?
    true :
    (albumsQuery.initialized && photosQuery.initialized)

  return {
    stats,
    loading,
    error,
    initialized,
    isUsingFallback: !!rpcStats.error && !!albumsQuery.data,
    refetch: () => {
      if (rpcStats.error) {
        albumsQuery.refetch()
        photosQuery.refetch()
      } else {
        rpcStats.refetch()
      }
    }
  }
}

/**
 * Hook for detailed album statistics with breakdowns
 */
export function useAlbumStats() {
  const { user } = useAuth()

  const albumsQuery = useSupabaseTable(
    'albums',
    {
      select: 'id, visibility, country_id, city_id',
      filters: { user_id: user?.id },
      component: 'useAlbumStats',
      action: 'fetch-detailed-albums',
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  const photosQuery = useSupabaseTable(
    'photos',
    {
      select: 'id',
      filters: { user_id: user?.id },
      component: 'useAlbumStats',
      action: 'fetch-photos-count',
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000,
    }
  )

  const stats = useMemo<AlbumStats>(() => {
    if (!albumsQuery.data) {
      return {
        totalAlbums: 0,
        totalPhotos: 0,
        countriesVisited: 0,
        citiesExplored: 0,
        publicAlbums: 0,
        privateAlbums: 0,
        friendsAlbums: 0
      }
    }

    const albums = (albumsQuery.data as Array<{id: string, visibility: string, country_id?: number, city_id?: number}>) || []
    const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id))
    const uniqueCities = new Set(albums.filter(a => a.city_id).map(a => a.city_id))

    const publicAlbums = albums.filter(a => a.visibility === 'public').length
    const privateAlbums = albums.filter(a => a.visibility === 'private').length
    const friendsAlbums = albums.filter(a => a.visibility === 'friends').length

    return {
      totalAlbums: albums.length,
      totalPhotos: Array.isArray(photosQuery.data) ? photosQuery.data.length : 0,
      countriesVisited: uniqueCountries.size,
      citiesExplored: uniqueCities.size,
      publicAlbums,
      privateAlbums,
      friendsAlbums
    }
  }, [albumsQuery.data, photosQuery.data])

  return {
    stats,
    loading: albumsQuery.loading || photosQuery.loading,
    error: albumsQuery.error || photosQuery.error,
    initialized: albumsQuery.initialized && photosQuery.initialized,
    refetch: () => {
      albumsQuery.refetch()
      photosQuery.refetch()
    }
  }
}

/**
 * Hook for recent albums with photos count
 */
export function useRecentAlbums(limit = 5) {
  const { user } = useAuth()

  return useSupabaseTable(
    'albums',
    {
      select: `
        *,
        photos(id)
      `,
      filters: { user_id: user?.id },
      orderBy: { column: 'created_at', ascending: false },
      limit,
      component: 'useRecentAlbums',
      action: 'fetch-recent-albums',
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000, // 1 minute - more frequent updates for recent content
    }
  )
}

/**
 * Hook for travel timeline statistics by year
 */
export function useTravelYears() {
  const { user } = useAuth()

  return useSupabaseRPC(
    'get_user_travel_years',
    { p_user_id: user?.id },
    {
      component: 'useTravelYears',
      action: 'fetch-travel-years',
      enabled: !!user?.id,
      staleTime: 10 * 60 * 1000, // 10 minutes - travel years don't change often
    }
  )
}

/**
 * Hook for travel data by specific year
 * Returns empty data - use useTravelTimeline instead for globe functionality
 */
export function useTravelByYear() {
  // This hook is deprecated - return empty data to avoid RPC errors
  // Use useTravelTimeline from src/lib/hooks/useTravelTimeline.ts instead
  return {
    data: [],
    loading: false,
    error: null
  }
}

/**
 * Hook for stats that automatically invalidate when albums/photos change
 * Useful for components that need real-time updates
 */
export function useRealtimeStats() {
  const dashboardStats = useDashboardStats()

  // TODO: Add real-time subscription when albums/photos change
  // This would use useSupabaseSubscription to listen for changes
  // and automatically refetch stats

  return dashboardStats
}