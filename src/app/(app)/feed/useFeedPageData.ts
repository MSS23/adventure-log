'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  album_count: number
  privacy_level?: string | null
}

export interface PopularDestination {
  location_name: string
  country_code: string | null
  latitude: number
  longitude: number
  album_count: number
  cover_photo_url: string | null
}

// Hook to fetch suggested users to follow
export function useSuggestedUsers(userId: string | undefined, limit = 5) {
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Suggest travelers with content — including PRIVATE accounts. A private
      // account's albums are hidden from us by RLS, so we can't count them
      // client-side; the SECURITY DEFINER RPC counts non-private published
      // albums server-side and already excludes the caller + anyone they
      // follow or have a pending request to. Clicking a private suggestion
      // lands on their locked profile, where they can send a follow request.
      const { data, error } = await supabase.rpc('get_suggested_travelers', {
        _user_id: userId,
        _limit: limit,
      })

      if (error) throw error

      if (data) {
        const mapped: SuggestedUser[] = (data as Array<{
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          privacy_level: string | null
          album_count: number
        }>).map(u => ({
          id: u.id,
          username: u.username,
          display_name: u.display_name,
          // Demo fixtures use DiceBear SVGs. Let the shared avatar fallback
          // render initials here so a third-party host can never blank the feed.
          avatar_url: u.avatar_url?.startsWith('https://api.dicebear.com/')
            ? null
            : u.avatar_url,
          album_count: Number(u.album_count) || 0,
          privacy_level: u.privacy_level,
        }))

        setUsers(mapped)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [userId, limit])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return { users, loading, refetch: fetchSuggestions }
}

// Hook to fetch popular destinations the user hasn't visited
export function usePopularDestinations(userId: string | undefined) {
  const [destinations, setDestinations] = useState<PopularDestination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      if (!userId) {
        setLoading(false)
        return
      }

      const supabase = createClient()

      try {
        // Get locations the user has already visited
        const { data: userAlbums } = await supabase
          .from('albums')
          .select('location_name')
          .eq('user_id', userId)
          .not('location_name', 'is', null)

        const visitedLocations = new Set(
          userAlbums?.map(a => a.location_name?.toLowerCase()) || []
        )

        // Get popular public albums with locations
        const { data: popularAlbums } = await supabase
          .from('albums')
          .select('location_name, country_code, latitude, longitude, cover_photo_url')
          .eq('visibility', 'public')
          .not('location_name', 'is', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100)

        if (popularAlbums) {
          // Group by location
          const locationMap = new globalThis.Map<string, PopularDestination>()

          for (const album of popularAlbums) {
            const key = album.location_name?.toLowerCase() || ''
            if (visitedLocations.has(key)) continue

            if (locationMap.has(key)) {
              const existing = locationMap.get(key)!
              existing.album_count++
            } else {
              locationMap.set(key, {
                location_name: album.location_name!,
                country_code: album.country_code,
                latitude: album.latitude!,
                longitude: album.longitude!,
                album_count: 1,
                cover_photo_url: album.cover_photo_url,
              })
            }
          }

          const sorted: PopularDestination[] = Array.from(locationMap.values())
            .sort((a: PopularDestination, b: PopularDestination) => b.album_count - a.album_count)
            .slice(0, 6)

          setDestinations(sorted)
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [userId])

  return { destinations, loading }
}
