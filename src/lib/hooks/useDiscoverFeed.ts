'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DiscoverAlbum {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_photo_url: string | null
  location_name: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  date_start: string | null
  created_at: string
  view_count: number
  like_count: number
  comment_count: number
  photo_count: number
  score: number
  owner_username: string
  owner_display_name: string | null
  owner_avatar_url: string | null
}

export function useDiscoverFeed(userId: string | undefined) {
  const [albums, setAlbums] = useState<DiscoverAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 20

  const fetchDiscover = useCallback(async (reset = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const currentOffset = reset ? 0 : offset
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_discover_feed', {
        p_user_id: userId,
        p_limit: PAGE_SIZE,
        p_offset: currentOffset,
      })

      if (error) {
        // If RPC doesn't exist yet, fall back to simple query
        const { data: fallbackData } = await supabase
          .from('albums')
          .select(`
            id, user_id, title, description, cover_photo_url,
            location_name, country_code, latitude, longitude,
            date_start, created_at, view_count,
            users!albums_user_id_fkey(username, display_name, avatar_url),
            photos(id)
          `)
          .or('visibility.eq.public,privacy.eq.public')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1)

        if (fallbackData) {
          const mapped: DiscoverAlbum[] = fallbackData
            .filter(a => a.photos && a.photos.length > 0)
            .map(a => {
              const owner = a.users as unknown as { username: string; display_name: string | null; avatar_url: string | null } | null
              return {
                id: a.id,
                user_id: a.user_id,
                title: a.title,
                description: a.description || null,
                cover_photo_url: a.cover_photo_url || null,
                location_name: a.location_name || null,
                country_code: a.country_code || null,
                latitude: a.latitude || null,
                longitude: a.longitude || null,
                date_start: a.date_start || null,
                created_at: a.created_at,
                view_count: a.view_count || 0,
                like_count: 0,
                comment_count: 0,
                photo_count: a.photos?.length || 0,
                score: 0,
                owner_username: owner?.username || 'unknown',
                owner_display_name: owner?.display_name || null,
                owner_avatar_url: owner?.avatar_url || null,
              }
            })

          if (reset) {
            setAlbums(mapped)
          } else {
            setAlbums(prev => [...prev, ...mapped])
          }
          setHasMore(mapped.length === PAGE_SIZE)
          setOffset(currentOffset + mapped.length)
        }
        return
      }

      const results = (data || []) as DiscoverAlbum[]

      if (reset) {
        setAlbums(results)
      } else {
        setAlbums(prev => [...prev, ...results])
      }
      setHasMore(results.length === PAGE_SIZE)
      setOffset(currentOffset + results.length)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [userId, offset])

  const refresh = useCallback(() => {
    setOffset(0)
    fetchDiscover(true)
  }, [fetchDiscover])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchDiscover(false)
    }
  }, [loading, hasMore, fetchDiscover])

  useEffect(() => {
    fetchDiscover(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { albums, loading, hasMore, loadMore, refresh }
}
