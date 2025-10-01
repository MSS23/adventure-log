'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  country?: string
  latitude?: number
  longitude?: number
  created_at: string
  cover_image_url?: string
  photo_count: number
  user_id: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface UseFeedDataReturn {
  albums: FeedAlbum[]
  loading: boolean
  error: string | null
  refreshFeed: () => Promise<void>
}

export function useFeedData(): UseFeedDataReturn {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<FeedAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchFeedData = useCallback(async () => {
    if (!user?.id) {
      setAlbums([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)

      // OPTIMIZED: Single query with JOIN to get public albums from all users
      // Fetch public albums with profile info using foreign key relationship
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select(`
          *,
          profiles!albums_user_id_fkey(username, name, avatar_url)
        `)
        .or('visibility.eq.public,visibility.is.null')
        .order('created_at', { ascending: false })
        .limit(30)

      if (albumsError) {
        log.error('Failed to fetch albums for feed', {
          component: 'useFeedData',
          action: 'fetch-albums',
          error: albumsError
        })
        throw albumsError
      }

      // Transform the data
      const feedAlbums: FeedAlbum[] = albumsData?.map(album => {
        // Extract profile data (handle both array and single object)
        const profile = Array.isArray(album.profiles) ? album.profiles[0] : album.profiles

        const location = [album.location_name, album.country_code]
          .filter(Boolean)
          .join(', ')

        return {
          id: album.id,
          title: album.title,
          description: album.description,
          location: location || undefined,
          country: album.country_code,
          latitude: album.latitude,
          longitude: album.longitude,
          created_at: album.created_at,
          cover_image_url: getPhotoUrl(album.cover_photo_url) || undefined,
          photo_count: 0, // We'll add this later if needed
          user_id: album.user_id,
          user: {
            id: album.user_id,
            username: profile?.username || 'user',
            display_name: profile?.name || profile?.username || 'User',
            avatar_url: profile?.avatar_url
          }
        }
      }) || []

      setAlbums(feedAlbums)

      log.info('Feed data loaded successfully', {
        component: 'useFeedData',
        albumCount: feedAlbums.length,
        userId: user.id
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feed data'
      setError(errorMessage)
      log.error('Error fetching feed data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  const refreshFeed = useCallback(async () => {
    await fetchFeedData()
  }, [fetchFeedData])

  // Load data when user changes
  useEffect(() => {
    if (user?.id) {
      fetchFeedData()
    } else {
      setAlbums([])
      setLoading(false)
      setError(null)
    }
  }, [user?.id, fetchFeedData])

  return {
    albums,
    loading,
    error,
    refreshFeed
  }
}