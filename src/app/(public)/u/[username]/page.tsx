import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PublicProfileContent } from '@/components/profile/PublicProfileContent'

function getServerPhotoUrl(filePath: string | null | undefined): string | undefined {
  if (!filePath) return undefined
  if (filePath.startsWith('http')) return filePath
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return undefined
  return `${supabaseUrl}/storage/v1/object/public/photos/${filePath}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params

  try {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('display_name, username, bio, avatar_url')
      .eq('username', username)
      .single()

    if (!user) {
      return { title: 'Traveler Not Found' }
    }

    const displayName = user.display_name || user.username || 'Traveler'
    const title = `${displayName} - Travel Adventures`
    const avatarUrl = getServerPhotoUrl(user.avatar_url)
    const description = user.bio
      || `Explore ${displayName}'s travel adventures and destinations on Adventure Log`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

    return {
      title,
      description,
      alternates: {
        canonical: `${appUrl}/u/${username}`,
      },
      openGraph: {
        title,
        description,
        type: 'profile',
        url: `${appUrl}/u/${username}`,
        ...(avatarUrl && {
          images: [{ url: avatarUrl, width: 400, height: 400, alt: displayName }],
        }),
      },
      twitter: {
        card: 'summary',
        title,
        description,
        ...(avatarUrl && { images: [avatarUrl] }),
      },
    }
  } catch {
    return { title: 'Traveler Profile | Adventure Log' }
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const supabase = await createClient()

  // Fetch user profile
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, bio, avatar_url, privacy_level')
    .eq('username', username)
    .single()

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Traveler not found</h1>
          <p className="text-gray-500">This profile doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  // Fetch public albums
  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, cover_photo_url, location_name, country_code, date_start, created_at')
    .eq('user_id', user.id)
    .or('visibility.eq.public,privacy.eq.public')
    .eq('status', 'published')
    .order('date_start', { ascending: false })
    .limit(50)

  // Fetch stats
  const countryCodes = [...new Set((albums || []).filter(a => a.country_code).map(a => a.country_code as string))]

  const { count: followerCount } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', user.id)
    .eq('status', 'accepted')

  return (
    <PublicProfileContent
      user={user}
      albums={albums || []}
      countryCodes={countryCodes}
      followerCount={followerCount || 0}
    />
  )
}
