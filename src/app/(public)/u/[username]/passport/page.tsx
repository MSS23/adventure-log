import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PublicPassportContent } from '@/components/passport/PublicPassportContent'
import { haversineKm } from '@/lib/utils/geoCalculations'

const continentMap: Record<string, string> = {
  US: 'North America', CA: 'North America', MX: 'North America', GT: 'North America',
  CR: 'North America', PA: 'North America', CU: 'North America', JM: 'North America',
  DO: 'North America', TT: 'North America', BS: 'North America', PR: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America',
  PE: 'South America', VE: 'South America', EC: 'South America', BO: 'South America',
  PY: 'South America', UY: 'South America',
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Europe',
  NL: 'Europe', BE: 'Europe', CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe',
  DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe', CZ: 'Europe', GR: 'Europe',
  HR: 'Europe', RO: 'Europe', HU: 'Europe', BG: 'Europe', RS: 'Europe', IS: 'Europe',
  SK: 'Europe', SI: 'Europe', LT: 'Europe', LV: 'Europe', EE: 'Europe', MT: 'Europe',
  CY: 'Europe', LU: 'Europe', AL: 'Europe', ME: 'Europe', MK: 'Europe', BA: 'Europe',
  UA: 'Europe', RU: 'Europe',
  CN: 'Asia', JP: 'Asia', KR: 'Asia', IN: 'Asia', TH: 'Asia', VN: 'Asia', ID: 'Asia',
  MY: 'Asia', SG: 'Asia', PH: 'Asia', TW: 'Asia', HK: 'Asia', MM: 'Asia', KH: 'Asia',
  LA: 'Asia', BD: 'Asia', LK: 'Asia', NP: 'Asia', PK: 'Asia', AE: 'Asia', SA: 'Asia',
  QA: 'Asia', KW: 'Asia', JO: 'Asia', LB: 'Asia', IL: 'Asia', TR: 'Asia', GE: 'Asia',
  ZA: 'Africa', EG: 'Africa', MA: 'Africa', KE: 'Africa', TZ: 'Africa', NG: 'Africa',
  GH: 'Africa', ET: 'Africa', TN: 'Africa', SN: 'Africa', RW: 'Africa', MU: 'Africa',
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
}

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

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
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
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

  const countryCodes = [...new Set(safeAlbums.filter(a => a.country_code).map(a => (a.country_code as string).toUpperCase()))]
  const cities = [...new Set(safeAlbums.filter(a => a.location_name).map(a => a.location_name!.split(',')[0]?.trim()))]

  // Compute distance
  const coords = safeAlbums
    .filter(a => a.latitude != null && a.longitude != null)
    .map(a => ({ lat: a.latitude!, lng: a.longitude! }))
  let totalDistance = 0
  for (let i = 1; i < coords.length; i++) {
    totalDistance += haversineKm(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng)
  }

  // Compute continents
  const continentsVisited = [...new Set(countryCodes.map(c => continentMap[c]).filter(Boolean))]

  // Compute personality
  let personality = 'Future Explorer'
  if (continentsVisited.length >= 5) personality = 'World Explorer'
  else if (countryCodes.length >= 15) personality = 'Globe Trotter'
  else if (countryCodes.length >= 10) personality = 'Cultural Nomad'
  else if (safeAlbums.length >= 12) personality = 'Perpetual Nomad'
  else if (countryCodes.length >= 5) personality = 'World Wanderer'
  else if (safeAlbums.length >= 6) personality = 'Adventure Seeker'
  else if (safeAlbums.length >= 3) personality = 'Weekend Warrior'
  else if (safeAlbums.length >= 1) personality = 'Rising Explorer'

  // First and latest trip. Only expose a distinct "latest" when there's more
  // than one album — otherwise the single album is both first and latest and
  // the UI would render two identical "First / Latest Adventure" cards.
  const firstTrip = safeAlbums[0] || null
  const latestTrip = safeAlbums.length > 1 ? safeAlbums[safeAlbums.length - 1] : null

  return (
    <PublicPassportContent
      user={user}
      countryCodes={countryCodes}
      cities={cities}
      totalAlbums={safeAlbums.length}
      totalPhotos={photoCount || 0}
      totalDistance={Math.round(totalDistance)}
      followerCount={followerCount || 0}
      continentsVisited={continentsVisited}
      personality={personality}
      firstTrip={firstTrip ? { title: firstTrip.title, location: firstTrip.location_name, date: firstTrip.date_start || firstTrip.created_at } : null}
      latestTrip={latestTrip ? { title: latestTrip.title, location: latestTrip.location_name, date: latestTrip.date_start || latestTrip.created_at } : null}
      memberSince={user.created_at}
    />
  )
}
