import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

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
  params: Promise<{ userId: string }>
}): Promise<Metadata> {
  const { userId } = await params

  try {
    const supabase = await createClient()

    // Support both UUID and username lookups
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const query = supabase
      .from('users')
      .select('display_name, username, bio, avatar_url')

    const { data: user } = isUUID
      ? await query.eq('id', userId).single()
      : await query.eq('username', userId).single()

    if (!user) {
      return { title: 'Profile Not Found' }
    }

    const displayName = user.display_name || user.username || 'Traveler'
    const title = `${displayName}'s Adventures`
    const avatarUrl = getServerPhotoUrl(user.avatar_url)
    const description = user.bio
      || `Check out ${displayName}'s travel adventures on Adventure Log`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        ...(avatarUrl && {
          images: [{ url: avatarUrl, width: 400, height: 400, alt: displayName }],
        }),
      },
      twitter: {
        card: avatarUrl ? 'summary' : 'summary',
        title,
        description,
        ...(avatarUrl && { images: [avatarUrl] }),
      },
    }
  } catch {
    return { title: 'Traveler Profile | Adventure Log' }
  }
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
