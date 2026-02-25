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
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: album } = await supabase
      .from('albums')
      .select(`
        title, description, location_name, cover_photo_url, cover_image_url,
        users!albums_user_id_fkey(display_name, username)
      `)
      .eq('id', id)
      .single()

    if (!album) {
      return { title: 'Album Not Found' }
    }

    const title = album.title || 'Travel Album'
    const coverUrl = getServerPhotoUrl(album.cover_photo_url || album.cover_image_url)
    const owner = (album as Record<string, unknown>).users as { display_name?: string; username?: string } | null
    const ownerName = owner?.display_name || owner?.username || 'a traveler'
    const description = album.description
      || (album.location_name
        ? `${title} - ${album.location_name} by ${ownerName} on Adventure Log`
        : `Travel album by ${ownerName} on Adventure Log`)

    return {
      title: `${title} | ${ownerName}`,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        ...(coverUrl && {
          images: [{ url: coverUrl, width: 1200, height: 630, alt: title }],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | ${ownerName}`,
        description,
        ...(coverUrl && { images: [coverUrl] }),
      },
    }
  } catch {
    return { title: 'Travel Album | Adventure Log' }
  }
}

export default function PublicAlbumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
