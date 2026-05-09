import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import ProfileContent from './ProfileContent'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const supabase = await createClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    redirect('/sign-in')
  }

  // Fetch albums with photo counts, and follow stats in parallel
  const [albumsResult, followersResult, followingResult] = await Promise.all([
    supabase
      .from('albums')
      .select('*, photos(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId)
      .eq('status', 'accepted'),
  ])

  // Only show published albums (with photos) on profile
  const publishedAlbums = (albumsResult.data || []).filter(a => (a.photos?.length || 0) > 0)

  const totalPhotos = publishedAlbums.reduce((sum, album) => sum + (album.photos?.length || 0), 0)

  const followStats = {
    followersCount: followersResult.count || 0,
    followingCount: followingResult.count || 0,
  }

  const countryCodes = [...new Set(
    publishedAlbums
      .filter(a => a.country_code)
      .map(a => a.country_code as string)
  )]

  const uniqueCities = new Set(
    publishedAlbums
      .filter(a => a.location_name)
      .map(a => a.location_name?.split(',')[0]?.trim())
  )

  const travelStats = {
    countries: countryCodes.length,
    cities: uniqueCities.size,
    photos: totalPhotos,
  }

  return (
    <ProfileContent
      profile={profile}
      userId={userId}
      initialAlbums={publishedAlbums}
      initialFollowStats={followStats}
      initialCountryCodes={countryCodes}
      initialTravelStats={travelStats}
    />
  )
}
