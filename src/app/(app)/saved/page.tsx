import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { log } from '@/lib/utils/logger'
import SavedContent, { type SavedAlbum } from './SavedContent'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user's favorited albums
  const { data: favorites, error: favError } = await supabase
    .from('likes')
    .select('target_id, created_at')
    .eq('user_id', user.id)
    .eq('target_type', 'album')
    .order('created_at', { ascending: false })

  if (favError) {
    log.error('Error fetching favorites', {
      component: 'SavedPage',
      action: 'server-fetch-favorites',
      userId: user.id,
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
      userId: user.id,
    }, albumError)
    return <SavedContent initialAlbums={[]} />
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
  }))

  return <SavedContent initialAlbums={savedAlbums} />
}
