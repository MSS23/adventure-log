import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PublicPassportContent } from '@/components/passport/PublicPassportContent'
import { PrivatePassportConnect } from '@/components/passport/PrivatePassportConnect'
import { computeTravelStats } from '@/lib/utils/travel-stats'


export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, display_name, username')
    .eq('username', username)
    .single()

  const displayName = user?.display_name || user?.username || 'Traveler'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventure-log-azure.vercel.app'

  return {
    title: `${displayName}'s Travel Passport | Adventure Log`,
    description: `See ${displayName}'s travel passport - countries visited, distances traveled, and travel personality.`,
    openGraph: {
      title: `${displayName}'s Travel Passport`,
      description: `Explore ${displayName}'s travel history on Adventure Log`,
      type: 'profile',
      url: `${appUrl}/u/${username}/passport`,
      // The travel-card endpoint resolves the profile by user id, not username.
      images: user ? [`${appUrl}/api/travel-card?userId=${user.id}`] : [],
    },
  }
}

export default async function PublicPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ connect?: string; t?: string }>
}) {
  const { username } = await params
  const query = await searchParams
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, bio, avatar_url, privacy_level, created_at')
    .eq('username', username)
    .single()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-1">
          <h1 className="al-display text-2xl md:text-3xl">Traveler not found</h1>
          <p className="text-sm text-muted-foreground">This passport doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  if (user.privacy_level === 'private') {
    if (query.connect === 'true') {
      return (
        <PrivatePassportConnect
          owner={user}
          qrToken={query.t}
          shouldConnect
        />
      )
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-1">
          <h1 className="al-display text-2xl md:text-3xl">Private Passport</h1>
          <p className="text-sm text-muted-foreground">This traveler&apos;s passport is private.</p>
        </div>
      </div>
    )
  }

  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, location_name, country_code, latitude, longitude, date_start, created_at, cover_photo_url')
    .eq('user_id', user.id)
    .eq('visibility', 'public')
    .neq('status', 'draft')
    .order('date_start', { ascending: true })

  const safeAlbums = albums || []

  // Count photos scoped to the public, non-draft albums shown here — counting
  // by user_id alone would leak the volume of private/draft-album photos.
  let photoCount = 0
  const albumIds = safeAlbums.map(a => a.id)
  if (albumIds.length > 0) {
    const { count } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .in('album_id', albumIds)
    photoCount = count || 0
  }

  const { count: followerCount } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', user.id)
    .eq('status', 'accepted')

  // Shared aggregation — the same math the app passport, Wrapped, and the
  // travel-card image use, so public numbers can't drift from private ones.
  // (First/latest trip follow the "latest only when >1 album" convention so
  // the UI never renders two identical adventure cards.)
  const stats = computeTravelStats(safeAlbums)

  return (
    <PublicPassportContent
      user={user}
      countryCodes={stats.countryCodes}
      cities={stats.cities}
      totalAlbums={safeAlbums.length}
      totalPhotos={photoCount || 0}
      totalDistance={stats.totalDistanceKm}
      followerCount={followerCount || 0}
      continentsVisited={stats.continentsVisited}
      personality={stats.personality.type}
      firstTrip={stats.firstTrip ? { title: stats.firstTrip.title, location: stats.firstTrip.location_name ?? null, date: stats.firstTrip.date_start || stats.firstTrip.created_at, latitude: stats.firstTrip.latitude } : null}
      latestTrip={stats.latestTrip ? { title: stats.latestTrip.title, location: stats.latestTrip.location_name ?? null, date: stats.latestTrip.date_start || stats.latestTrip.created_at, latitude: stats.latestTrip.latitude } : null}
      memberSince={user.created_at}
    />
  )
}
