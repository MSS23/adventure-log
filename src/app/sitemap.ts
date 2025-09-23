import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'
  const supabase = createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  try {
    // Fetch public albums
    const { data: albums } = await supabase
      .from('albums')
      .select('id, updated_at, created_at')
      .eq('visibility', 'public')
      .order('updated_at', { ascending: false })
      .limit(5000) // Limit to prevent huge sitemaps

    const albumPages: MetadataRoute.Sitemap = albums?.map((album) => ({
      url: `${baseUrl}/albums/${album.id}`,
      lastModified: new Date(album.updated_at || album.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })) || []

    // Fetch public profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at, created_at')
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1000) // Limit to prevent huge sitemaps

    const profilePages: MetadataRoute.Sitemap = profiles?.map((profile) => ({
      url: `${baseUrl}/profile/${profile.username}`,
      lastModified: new Date(profile.updated_at || profile.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || []

    return [...staticPages, ...albumPages, ...profilePages]
  } catch (error) {
    log.error('Error generating sitemap', { error })
    // Return static pages only if database query fails
    return staticPages
  }
}