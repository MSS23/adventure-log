'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useFollows } from '@/lib/hooks/useFollows'
import {
  groupAlbumsByPlace,
  placeSlug,
  slugSearchTerm,
  type PlaceAlbumInput,
  type PlaceGroup,
} from '@/lib/utils/places'
import { log } from '@/lib/utils/logger'

export type PlacesScope = 'you' | 'friends' | 'everyone'

export interface PlaceOwner {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// Columns every places query pulls from `albums`. Kept in one place so the
// index and feed queries stay in sync.
const ALBUM_LOCATION_COLUMNS = `
  id,
  user_id,
  title,
  cover_photo_url,
  location_name,
  country_code,
  latitude,
  longitude,
  created_at,
  date_start,
  start_date,
  visibility,
  status,
  photos(id),
  users!albums_user_id_fkey(id, username, display_name, avatar_url)
`

interface RawAlbumRow {
  id: string
  user_id: string
  title: string
  cover_photo_url?: string | null
  location_name?: string | null
  country_code?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at: string
  date_start?: string | null
  start_date?: string | null
  photos?: Array<{ id: string }> | null
  users?: PlaceOwner | PlaceOwner[] | null
}

function normalizeOwner(users: RawAlbumRow['users']): PlaceOwner | undefined {
  if (!users) return undefined
  return Array.isArray(users) ? users[0] : users
}

function toPlaceAlbum(row: RawAlbumRow): PlaceAlbumInput {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    cover_photo_url: row.cover_photo_url ?? null,
    location_name: row.location_name ?? null,
    country_code: row.country_code ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    created_at: row.created_at,
    date_start: row.date_start ?? null,
    start_date: row.start_date ?? null,
  }
}

/**
 * Places directory: groups the current user's / their friends' / everyone's
 * geotagged albums into location "places". RLS on `albums` transparently limits
 * results to what the viewer is allowed to see, so no manual privacy filtering
 * is needed here.
 */
export function usePlaces(scope: PlacesScope) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const { following } = useFollows(user?.id || '')

  const friendIds = useMemo(
    () => following.filter((f) => f.following).map((f) => f.following!.id),
    [following]
  )

  const query = useQuery({
    queryKey: ['places', scope, user?.id ?? null, scope === 'friends' ? friendIds : null],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ places: PlaceGroup[]; owners: Record<string, PlaceOwner> }> => {
      let q = supabase
        .from('albums')
        .select(ALBUM_LOCATION_COLUMNS)
        .not('location_name', 'is', null)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(scope === 'everyone' ? 300 : 500)

      if (scope === 'you') {
        q = q.eq('user_id', user!.id)
      } else if (scope === 'friends') {
        if (friendIds.length === 0) return { places: [], owners: {} }
        q = q.in('user_id', friendIds)
      } else {
        q = q.eq('visibility', 'public').neq('user_id', user!.id)
      }

      const { data, error } = await q
      if (error) throw error

      const rows = (data || []) as unknown as RawAlbumRow[]
      // Only albums that actually have photos count as visited places.
      const withPhotos = rows.filter((r) => r.photos && r.photos.length > 0)

      const owners: Record<string, PlaceOwner> = {}
      for (const row of withPhotos) {
        const owner = normalizeOwner(row.users)
        if (owner) owners[row.user_id] = owner
      }

      const places = groupAlbumsByPlace(withPhotos.map(toPlaceAlbum))
      return { places, owners }
    },
  })

  if (query.error) {
    log.error(
      'Failed to load places',
      { component: 'usePlaces', action: 'query', scope },
      query.error instanceof Error ? query.error : new Error(String(query.error))
    )
  }

  const places = useMemo(() => query.data?.places ?? [], [query.data?.places])
  const owners = query.data?.owners ?? {}

  const stats = useMemo(() => {
    const countries = new Set(places.map((p) => p.country_code).filter(Boolean))
    const albums = places.reduce((sum, p) => sum + p.albumCount, 0)
    return { placeCount: places.length, countryCount: countries.size, albumCount: albums }
  }, [places])

  return {
    places,
    owners,
    stats,
    loading: query.isLoading,
    error: query.error ? 'Failed to load places' : null,
    refetch: query.refetch,
  }
}

export interface LocationFeedAlbum extends PlaceAlbumInput {
  owner?: PlaceOwner
}

/**
 * The feed for a single place (TikTok-style location page): every album the
 * viewer can see that shares this location slug — theirs, their friends', and
 * public ones.
 */
export function useLocationFeed(slug: string | undefined) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const query = useQuery({
    queryKey: ['location-feed', slug ?? null, user?.id ?? null],
    enabled: !!slug && !!user?.id,
    queryFn: async () => {
      const term = slugSearchTerm(slug!)

      const { data, error } = await supabase
        .from('albums')
        .select(ALBUM_LOCATION_COLUMNS)
        .not('location_name', 'is', null)
        .ilike('location_name', `%${term}%`)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(400)

      if (error) throw error

      const rows = (data || []) as unknown as RawAlbumRow[]

      // Narrow the loose ilike pre-filter to an exact slug match, and require
      // photos so empty drafts don't show up.
      const matched = rows
        .filter((r) => r.photos && r.photos.length > 0)
        .filter((r) => placeSlug(r.location_name) === slug)

      const albums: LocationFeedAlbum[] = matched.map((row) => ({
        ...toPlaceAlbum(row),
        owner: normalizeOwner(row.users),
      }))

      const name = albums[0]?.location_name || term
      const countryCode = albums.find((a) => a.country_code)?.country_code ?? null
      const coords = albums.find((a) => a.latitude != null && a.longitude != null)
      const contributorIds = Array.from(new Set(albums.map((a) => a.user_id)))
      const youHaveBeen = !!user && albums.some((a) => a.user_id === user.id)

      return {
        name,
        countryCode,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        albums,
        contributorCount: contributorIds.length,
        youHaveBeen,
      }
    },
  })

  if (query.error) {
    log.error(
      'Failed to load location feed',
      { component: 'useLocationFeed', action: 'query', slug },
      query.error instanceof Error ? query.error : new Error(String(query.error))
    )
  }

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error ? 'Failed to load location' : null,
    refetch: query.refetch,
  }
}
