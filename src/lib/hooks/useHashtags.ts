/**
 * useHashtags Hook
 *
 * React hook for managing hashtags - trending, search, and album associations
 */

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Hashtag, AlbumHashtag } from '@/types/database'
import { log } from '@/lib/utils/logger'

export interface UseHashtagsOptions {
  enableCache?: boolean
}

export function useHashtags(options: UseHashtagsOptions = {}) {
  const { enableCache = true } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  /**
   * Get trending hashtags
   */
  const getTrendingHashtags = useCallback(
    async (limit = 20): Promise<Hashtag[]> => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('hashtags')
          .select('*')
          .not('trending_rank', 'is', null)
          .order('trending_rank', { ascending: true })
          .limit(limit)

        if (fetchError) {
          log.error('Error fetching trending hashtags', {
            component: 'useHashtags',
            action: 'getTrendingHashtags',
            error: fetchError
          })
          throw fetchError
        }

        log.info('Fetched trending hashtags', {
          component: 'useHashtags',
          action: 'getTrendingHashtags',
          count: data?.length || 0
        })

        return data || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trending hashtags'
        setError(errorMessage)
        log.error('Failed to fetch trending hashtags', { component: 'useHashtags', action: 'getTrendingHashtags' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Search hashtags by tag name
   */
  const searchHashtags = useCallback(
    async (query: string, limit = 10): Promise<Hashtag[]> => {
      if (!query || query.length < 1) {
        return []
      }

      try {
        setIsLoading(true)
        setError(null)

        // Remove # if present
        const cleanQuery = query.replace(/^#/, '')

        const { data, error: searchError } = await supabase
          .from('hashtags')
          .select('*')
          .ilike('tag', `%${cleanQuery}%`)
          .order('usage_count', { ascending: false })
          .limit(limit)

        if (searchError) {
          log.error('Error searching hashtags', {
            component: 'useHashtags',
            action: 'searchHashtags',
            error: searchError
          })
          throw searchError
        }

        return data || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search hashtags'
        setError(errorMessage)
        log.error('Failed to search hashtags', { component: 'useHashtags', action: 'searchHashtags' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Add hashtag to album
   */
  const addHashtagToAlbum = useCallback(
    async (albumId: string, tag: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Get or create hashtag using database function
        const { data: hashtagId, error: rpcError } = await supabase
          .rpc('get_or_create_hashtag', { p_tag: tag })

        if (rpcError) {
          log.error('Error getting/creating hashtag', {
            component: 'useHashtags',
            action: 'addHashtagToAlbum',
            error: rpcError
          })
          throw rpcError
        }

        if (!hashtagId) {
          throw new Error('Failed to get hashtag ID')
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('User not authenticated')
        }

        // Link hashtag to album
        const { error: insertError } = await supabase
          .from('album_hashtags')
          .insert({
            album_id: albumId,
            hashtag_id: hashtagId,
            added_by_user_id: user.id
          })

        if (insertError) {
          // Check if it's a unique constraint violation (hashtag already added)
          if (insertError.code === '23505') {
            log.info('Hashtag already added to album', {
              component: 'useHashtags',
              action: 'addHashtagToAlbum',
              albumId,
              tag
            })
            return true
          }

          log.error('Error linking hashtag to album', {
            component: 'useHashtags',
            action: 'addHashtagToAlbum',
            error: insertError
          })
          throw insertError
        }

        log.info('Hashtag added to album', {
          component: 'useHashtags',
          action: 'addHashtagToAlbum',
          albumId,
          tag
        })

        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add hashtag to album'
        setError(errorMessage)
        log.error('Failed to add hashtag to album', { component: 'useHashtags', action: 'addHashtagToAlbum' }, err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Remove hashtag from album
   */
  const removeHashtagFromAlbum = useCallback(
    async (albumId: string, hashtagId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('album_hashtags')
          .delete()
          .eq('album_id', albumId)
          .eq('hashtag_id', hashtagId)

        if (deleteError) {
          log.error('Error removing hashtag from album', {
            component: 'useHashtags',
            action: 'removeHashtagFromAlbum',
            error: deleteError
          })
          throw deleteError
        }

        log.info('Hashtag removed from album', {
          component: 'useHashtags',
          action: 'removeHashtagFromAlbum',
          albumId,
          hashtagId
        })

        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove hashtag'
        setError(errorMessage)
        log.error('Failed to remove hashtag', { component: 'useHashtags', action: 'removeHashtagFromAlbum' }, err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Get hashtags for an album
   */
  const getAlbumHashtags = useCallback(
    async (albumId: string): Promise<Hashtag[]> => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('album_hashtags')
          .select('hashtag:hashtags(*)')
          .eq('album_id', albumId)
          .order('created_at', { ascending: false })

        if (fetchError) {
          log.error('Error fetching album hashtags', {
            component: 'useHashtags',
            action: 'getAlbumHashtags',
            error: fetchError
          })
          throw fetchError
        }

        // Extract hashtags from nested structure
        const hashtags = (data || [])
          .map(item => (item as any).hashtag)
          .filter(Boolean) as Hashtag[]

        return hashtags
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch album hashtags'
        setError(errorMessage)
        log.error('Failed to fetch album hashtags', { component: 'useHashtags', action: 'getAlbumHashtags' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Get albums by hashtag
   */
  const getAlbumsByHashtag = useCallback(
    async (tag: string, limit = 20): Promise<any[]> => {
      try {
        setIsLoading(true)
        setError(null)

        // First get the hashtag ID
        const { data: hashtagData, error: hashtagError } = await supabase
          .from('hashtags')
          .select('id')
          .ilike('tag', tag)
          .single()

        if (hashtagError || !hashtagData) {
          return []
        }

        // Get albums with this hashtag
        const { data, error: fetchError } = await supabase
          .from('album_hashtags')
          .select(`
            album:albums(
              id,
              title,
              description,
              cover_photo_url,
              location_name,
              country_code,
              created_at,
              user:users(
                id,
                username,
                display_name,
                avatar_url
              )
            )
          `)
          .eq('hashtag_id', hashtagData.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          log.error('Error fetching albums by hashtag', {
            component: 'useHashtags',
            action: 'getAlbumsByHashtag',
            error: fetchError
          })
          throw fetchError
        }

        // Extract albums from nested structure
        const albums = (data || [])
          .map(item => (item as any).album)
          .filter(Boolean)

        return albums
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch albums by hashtag'
        setError(errorMessage)
        log.error('Failed to fetch albums by hashtag', { component: 'useHashtags', action: 'getAlbumsByHashtag' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  return {
    isLoading,
    error,
    getTrendingHashtags,
    searchHashtags,
    addHashtagToAlbum,
    removeHashtagFromAlbum,
    getAlbumHashtags,
    getAlbumsByHashtag
  }
}
