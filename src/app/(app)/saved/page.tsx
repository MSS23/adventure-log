import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { log } from '@/lib/utils/logger'
import SavedContent, { type SavedAlbum } from './SavedContent'
import SavedLoading from './loading'

export default function SavedPage() {
  return (
    <Suspense fallback={<SavedLoading />}>
      <SavedData />
    </Suspense>
  )
}

async function SavedData() {
  const supabase = await createClient()
  // Read the user id from verified JWT claims instead of a round-trip to the
  // Supabase Auth server. Middleware already validated the session this request
  // and every query below is user-scoped + RLS-protected.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    redirect('/login')
  }

  // Fetch user's favorited albums
  const { data: favorites, error: favError } = await supabase
    .from('likes')
    .select('target_id, created_at')
    .eq('user_id', userId)
    .eq('target_type', 'album')
    .order('created_at', { ascending: false })

  if (favError) {
    log.error('Error fetching favorites', {
      component: 'SavedPage',
      action: 'server-fetch-favorites',
      userId,
    }, favError)
    return <SavedContent initialAlbums={[]} />
  }

  if (!favorites || favorites.length === 0) {
    return <SavedContent initialAlbums={[]} />
  }

  // Fetch album details for each favorite
  const albumIds = favorites.map(f => f.target_id)
  const { data: albums, error: albumError } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      cover_photo_url,
      location_name,
      country_code,
      latitude,
      longitude,
      user_id,
      users:user_id (
        username,
        display_name,
        avatar_url
      )
    `)
    .in('id', albumIds)

  if (albumError) {
    log.error('Error fetching saved album details', {
      component: 'SavedPage',
      action: 'server-fetch-albums',
      userId,
    }, albumError)
    return <SavedContent initialAlbums={[]} />
  }

  // Fetch like counts for popularity in one query, tallied in memory.
  // No denormalized count column exists, so we aggregate from the `likes` table
  // (same source the Explore feed scores against). target_id stores album ids as text.
  const popularityByAlbum = new Map<string, number>()
  const { data: likeRows, error: likeCountError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'album')
    .in('target_id', albumIds)

  if (likeCountError) {
    log.error('Error fetching saved album popularity', {
      component: 'SavedPage',
      action: 'server-fetch-like-counts',
      userId,
    }, likeCountError)
  } else {
    for (const row of likeRows || []) {
      popularityByAlbum.set(row.target_id, (popularityByAlbum.get(row.target_id) || 0) + 1)
    }
  }

  // Map albums to SavedAlbum shape with savedAt timestamps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedAlbums: SavedAlbum[] = (albums || []).map((album: any) => ({
    id: album.id,
    title: album.title,
    cover_photo_url: album.cover_photo_url,
    location_name: album.location_name,
    country_code: album.country_code,
    latitude: album.latitude,
    longitude: album.longitude,
    user_id: album.user_id,
    user: album.users,
    savedAt: favorites.find(f => f.target_id === album.id)?.created_at || '',
    popularity: popularityByAlbum.get(album.id) || 0,
  }))

  return <SavedContent initialAlbums={savedAlbums} />
}
