'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  album_count: number
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
      // Get IDs the user already follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('status', ['accepted', 'pending'])

      const followedIds = following?.map(f => f.following_id) || []
      const excludeIds = [userId, ...followedIds]

      // Get users with public albums, ordered by album count
      const { data } = await supabase
        .from('users')
        .select(`
          id, username, display_name, avatar_url,
          albums!albums_user_id_fkey(id)
        `)
        .eq('privacy_level', 'public')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(limit + 10) // Fetch extra in case some have no albums

      if (data) {
        const mapped: SuggestedUser[] = data
          .map(u => ({
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            album_count: (u.albums as unknown as Array<{ id: string }>)?.length || 0,
          }))
          .filter(u => u.album_count > 0)
          .sort((a, b) => b.album_count - a.album_count)
          .slice(0, limit)

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
