import { MetadataRoute } from 'next'

// Check if this is a mobile build
const isMobile = process.env.MOBILE_BUILD === 'true';

// Configure for static export
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

  // Static pages - simplified for mobile builds
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/albums`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/globe`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // For mobile builds, return static pages only
  if (isMobile) {
    return staticPages;
  }

  // For web builds, include dynamic content (original logic)
  try {
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()

    // Fetch public albums
    const { data: albums } = await supabase
      .from('albums')
      .select('id, updated_at, created_at')
      .eq('visibility', 'public')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(5000)

    const albumPages: MetadataRoute.Sitemap = albums?.map((album) => ({
      url: `${baseUrl}/albums/${album.id}`,
      lastModified: new Date(album.updated_at || album.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })) || []

    return [...staticPages, ...albumPages]
  } catch {
    return staticPages
  }
}