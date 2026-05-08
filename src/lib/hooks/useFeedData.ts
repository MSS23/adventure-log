'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import type { Album } from '@/types/database'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  country?: string
  latitude?: number
  longitude?: number
  created_at: string
  date_start?: string
  cover_image_url?: string
  cover_photo_x_offset?: number
  cover_photo_y_offset?: number
  photo_count: number
  likes_count: number
  comments_count: number
  user_id: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  photos?: Array<{
    id: string
    file_path: string
    caption?: string
    taken_at?: string
  }>
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

      // Fetch user's friends list
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      const friendIds = new Set(followsData?.map(f => f.following_id) || [])

      // Fetch albums with user info
      // Include: public albums, friends-only albums from friends, and user's own albums
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select(`
          *,
          users!albums_user_id_fkey(username, display_name, avatar_url, privacy_level)
        `)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(100)

      if (albumsError) {
        log.error('Failed to fetch albums for feed', {
          component: 'useFeedData',
          action: 'fetch-albums',
          error: albumsError
        })
        throw albumsError
      }

      log.info('Fetched albums from database', {
        component: 'useFeedData',
        action: 'fetch-albums',
        totalAlbums: albumsData?.length || 0,
        friendCount: friendIds.size
      })

      // Filter albums based on privacy and friendship
      const accessibleAlbums = albumsData?.filter(album => {
        const userData = Array.isArray(album.users) ? album.users[0] : album.users
        if (!userData) return false

        // Always show user's own albums
        if (album.user_id === user.id) return true

        // Check album visibility
        const albumVisibility = album.visibility || 'public'
        const userPrivacy = userData.privacy_level || 'public'

        // If user's profile is private, only show to friends
        if (userPrivacy === 'private' && !friendIds.has(album.user_id)) {
          return false
        }

        // Check album-specific visibility
        if (albumVisibility === 'public') return true
        if (albumVisibility === 'friends' && friendIds.has(album.user_id)) return true
        if (albumVisibility === 'private') return false

        return false
      }) || []

      log.info('Filtered accessible albums', {
        component: 'useFeedData',
        action: 'filter-albums',
        accessibleCount: accessibleAlbums.length,
        userId: user.id
      })

      // Get album IDs for batch fetching likes and comments
      const albumIds = accessibleAlbums?.map(a => a.id) || []

      // Fetch photos, likes, and comments in parallel (instead of sequentially)
      let photosData: Array<{
        id: string
        album_id: string
        file_path: string
        caption?: string
        taken_at?: string
      }> | null = null
      let likesData: { target_id: string }[] | null = null
      let commentsData: { target_id: string }[] | null = null

      if (albumIds.length > 0) {
        const [photosResult, likesResult, commentsResult] = await Promise.all([
          supabase
            .from('photos')
            .select('id, album_id, file_path, caption, taken_at')
            .in('album_id', albumIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('likes')
            .select('target_id')
            .eq('target_type', 'album')
            .in('target_id', albumIds),
          supabase
            .from('comments')
            .select('target_id')
            .eq('target_type', 'album')
            .in('target_id', albumIds),
        ])
        photosData = photosResult.data
        likesData = likesResult.data
        commentsData = commentsResult.data
      }

      // Create maps for quick lookup
      const photosMap = new Map<string, Array<{
        id: string
        file_path: string
        caption?: string
        taken_at?: string
      }>>()
      photosData?.forEach(photo => {
        const albumPhotos = photosMap.get(photo.album_id) || []
        albumPhotos.push({
          id: photo.id,
          file_path: photo.file_path,
          caption: photo.caption,
          taken_at: photo.taken_at
        })
        photosMap.set(photo.album_id, albumPhotos)
      })

      const likesCountMap = new Map<string, number>()
      likesData?.forEach(like => {
        likesCountMap.set(like.target_id, (likesCountMap.get(like.target_id) || 0) + 1)
      })

      const commentsCountMap = new Map<string, number>()
      commentsData?.forEach(comment => {
        commentsCountMap.set(comment.target_id, (commentsCountMap.get(comment.target_id) || 0) + 1)
      })

      // Transform the data and filter out albums with missing user profiles
      const feedAlbums: FeedAlbum[] = (accessibleAlbums
        ?.map(album => {
          // Extract user data (handle both array and single object)
          const userData = Array.isArray(album.users) ? album.users[0] : album.users

          // Skip albums where user profile doesn't exist
          if (!userData) {
            log.warn('Skipping album with missing user profile', {
              component: 'useFeedData',
              albumId: album.id,
              userId: album.user_id
            })
            return null
          }

          const location = [album.location_name, album.country_code]
            .filter(Boolean)
            .join(', ')

          // Get the cover image URL - convert file path to public URL
          const coverPhotoPath = album.cover_photo_url
          const coverImageUrl = coverPhotoPath ? getPhotoUrl(coverPhotoPath) : undefined

          // Validate cover image URL - only return if it's a valid HTTP(S) URL
          const validCoverUrl = coverImageUrl && (coverImageUrl.startsWith('http://') || coverImageUrl.startsWith('https://'))
            ? coverImageUrl
            : undefined

          // Validate avatar URL - only return if it's a valid HTTP(S) URL
          const rawAvatarUrl = userData?.avatar_url
          const validAvatarUrl = rawAvatarUrl && (rawAvatarUrl.startsWith('http://') || rawAvatarUrl.startsWith('https://'))
            ? rawAvatarUrl
            : undefined

          const albumPhotos = photosMap.get(album.id) || []

          return {
            id: album.id,
            title: album.title,
            description: album.description,
            location: location || undefined,
            country: album.country_code,
            latitude: album.latitude,
            longitude: album.longitude,
            created_at: album.created_at,
            date_start: album.date_start || album.start_date,
            cover_image_url: validCoverUrl,
            cover_photo_x_offset: album.cover_photo_x_offset,
            cover_photo_y_offset: album.cover_photo_y_offset,
            photo_count: albumPhotos.length,
            likes_count: likesCountMap.get(album.id) || 0,
            comments_count: commentsCountMap.get(album.id) || 0,
            user_id: album.user_id,
            user: {
              id: album.user_id,
              // Use username if available, otherwise generate from user_id
              username: userData.username || `user_${album.user_id.slice(0, 8)}`,
              display_name: userData.display_name || userData.username || 'Anonymous User',
              avatar_url: validAvatarUrl
            },
            photos: albumPhotos.slice(0, 10) // Limit to 10 photos per album for performance
          }
        })
        .filter(album => album !== null) || []) as FeedAlbum[]

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

  // Set up real-time subscriptions for albums and follows
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('feed_albums_realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`
        },
        (payload) => {
          try {
            log.info('Follow status changed, refreshing feed', {
              event: payload.eventType,
              followId: (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id
            })
            fetchFeedData()
          } catch (err) {
            log.error('Error handling follow change', { component: 'useFeedData' }, err as Error)
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'albums'
        },
        (payload) => {
          try {
            log.info('Album deletion detected', { albumId: payload.old.id })
            setAlbums(prev => prev.filter(album => album.id !== payload.old.id))
          } catch (err) {
            log.error('Error handling album deletion', { component: 'useFeedData' }, err as Error)
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'albums'
        },
        async (payload) => {
          try {
            const updatedAlbum = payload.new as Partial<Album>

            setAlbums(prev => {
              const existingIndex = prev.findIndex(album => album.id === updatedAlbum.id)
              if (existingIndex === -1) return prev

              if (updatedAlbum.status === 'draft' || (updatedAlbum as Record<string, unknown>).deleted_at) {
                return prev.filter(album => album.id !== updatedAlbum.id)
              }

              const updated = [...prev]
              updated[existingIndex] = {
                ...updated[existingIndex],
                title: updatedAlbum.title || updated[existingIndex].title,
                description: updatedAlbum.description,
                location: [updatedAlbum.location_name, updatedAlbum.country_code].filter(Boolean).join(', ') || undefined,
                country: updatedAlbum.country_code,
                latitude: updatedAlbum.latitude,
                longitude: updatedAlbum.longitude,
                cover_photo_x_offset: updatedAlbum.cover_photo_x_offset,
                cover_photo_y_offset: updatedAlbum.cover_photo_y_offset,
              }
              return updated
            })

            // Fetch updated photos if the album is in our feed
            const { data: photos } = await supabase
              .from('photos')
              .select('id, file_path, caption, taken_at')
              .eq('album_id', updatedAlbum.id)
              .order('display_order', { ascending: true })
              .order('created_at', { ascending: true })
              .limit(10)

            if (photos) {
              setAlbums(prev => prev.map(album =>
                album.id === updatedAlbum.id
                  ? { ...album, photos }
                  : album
              ))
            }
          } catch (err) {
            log.error('Error handling album update', { component: 'useFeedData' }, err as Error)
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'albums'
        },
        (payload) => {
          try {
            log.info('New album created', { albumId: payload.new.id })
          } catch (err) {
            log.error('Error handling new album event', { component: 'useFeedData' }, err as Error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- albums and fetchFeedData are intentionally excluded to avoid infinite re-renders
  }, [user?.id, supabase])

  return {
    albums,
    loading,
    error,
    refreshFeed
  }
}