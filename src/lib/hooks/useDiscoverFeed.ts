'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

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

  // Monotonic id per fetch: a response only applies if it's still the latest
  // request AND was issued for the userId currently rendered, so a slow stale
  // response from a previous user can't overwrite the new user's feed.
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const currentUserIdRef = useRef(userId)

  const fetchDiscover = useCallback(async (reset = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    // `loading` is async state, so two loadMore calls in the same tick both
    // pass the loading check and fetch the same offset. A synchronous ref
    // guards reentrancy; resets supersede in-flight requests instead.
    if (!reset && inFlightRef.current) return

    const requestId = ++requestIdRef.current
    const requestUserId = userId
    inFlightRef.current = true
    setLoading(true)
    const currentOffset = reset ? 0 : offset
    const supabase = createClient()
    const isCurrent = () =>
      requestId === requestIdRef.current && requestUserId === currentUserIdRef.current

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
            date_start, created_at,
            users!albums_user_id_fkey(username, display_name, avatar_url),
            photos(id)
          `)
          .eq('visibility', 'public')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1)

        if (fallbackData && isCurrent()) {
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
                view_count: 0,
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
            // Dedupe on append — offset pagination can re-serve rows when
            // content is inserted between pages.
            setAlbums(prev => {
              const seen = new Set(prev.map(a => a.id))
              return [...prev, ...mapped.filter(a => !seen.has(a.id))]
            })
          }
          // Advance by the RAW fetched count, not the photo-filtered count:
          // filtering after .range() otherwise re-reads overlapping rows next
          // page (duplicates) and flips hasMore off the first time a page
          // contains any photo-less album (feed ends early).
          setHasMore(fallbackData.length === PAGE_SIZE)
          setOffset(currentOffset + fallbackData.length)
        }
        return
      }

      if (!isCurrent()) return

      const results = (data || []) as DiscoverAlbum[]

      if (reset) {
        setAlbums(results)
      } else {
        setAlbums(prev => {
          const seen = new Set(prev.map(a => a.id))
          return [...prev, ...results.filter(a => !seen.has(a.id))]
        })
      }
      setHasMore(results.length === PAGE_SIZE)
      setOffset(currentOffset + results.length)
    } catch (err) {
      if (isCurrent()) {
        log.error('Discover feed fetch failed', {
          component: 'useDiscoverFeed',
          action: 'fetchDiscover',
          userId: requestUserId
        }, err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      // Only the latest request may release the guard/loading state —
      // otherwise a stale response would unlock while a newer one runs.
      if (isCurrent()) {
        inFlightRef.current = false
        setLoading(false)
      }
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
    // Record the active userId before fetching so responses issued for a
    // previous user are dropped by isCurrent().
    currentUserIdRef.current = userId
    fetchDiscover(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { albums, loading, hasMore, loadMore, refresh }
}
