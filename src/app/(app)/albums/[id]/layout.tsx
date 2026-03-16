import type { Metadata } from 'next'

function getServerPhotoUrl(filePath: string | null | undefined): string | undefined {
  if (!filePath) return undefined
  if (filePath.startsWith('http')) return filePath
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return undefined
  return `${supabaseUrl}/storage/v1/object/public/photos/${filePath}`
}

// Generate static params for dynamic album routes
export async function generateStaticParams() {
  // For mobile builds, return empty array (dynamic routes will work at runtime)
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params

    // Dynamic import to avoid module-level throw if env vars are missing during build
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: album, error } = await supabase
      .from('albums')
      .select('title, description, location_name, cover_photo_url, cover_image_url')
      .eq('id', id)
      .single()

    if (error || !album) {
      return { title: 'Album Not Found | Adventure Log' }
    }

    const title = album.title || 'Travel Album'
    const coverUrl = getServerPhotoUrl(album.cover_photo_url || album.cover_image_url)
    const description = album.description
      || (album.location_name ? `Travel album from ${album.location_name}` : 'A travel album on Adventure Log')

    return {
      title,
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
        title,
        description,
        ...(coverUrl && { images: [coverUrl] }),
      },
    }
  } catch {
    return { title: 'Travel Album | Adventure Log' }
  }
}

export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  return children
}