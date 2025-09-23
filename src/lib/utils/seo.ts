import type { Metadata } from 'next'

interface SEOConfig {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  imageAlt?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  tags?: string[]
  noIndex?: boolean
  noFollow?: boolean
}

export function generateSEOMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image,
    imageAlt,
    url,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    tags = [],
    noIndex = false,
    noFollow = false,
  } = config

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl
  const ogImage = image ? `${baseUrl}${image}` : `${baseUrl}/og-image.png`

  return {
    title,
    description,
    keywords: [...keywords, ...tags],
    openGraph: {
      type,
      url: fullUrl,
      title,
      description,
      siteName: 'Adventure Log',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt || title || 'Adventure Log',
        },
      ],
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        authors: author ? [author] : undefined,
        tags: tags.length > 0 ? tags : undefined,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: author ? `@${author}` : '@adventurelog',
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
      nocache: false,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

// Pre-configured metadata generators for common page types

export function generateAlbumSEOMetadata(album: {
  id: string
  title: string
  description?: string | null
  coverPhotoUrl?: string | null
  location?: string | null
  startDate?: string | null
  endDate?: string | null
  tags?: string[] | null
  username?: string
  userDisplayName?: string | null
  photoCount?: number
}) {
  const location = album.location ? ` in ${album.location}` : ''
  const dates = album.startDate && album.endDate
    ? ` from ${new Date(album.startDate).toLocaleDateString()} to ${new Date(album.endDate).toLocaleDateString()}`
    : album.startDate
    ? ` starting ${new Date(album.startDate).toLocaleDateString()}`
    : ''

  const photoCountText = album.photoCount ? ` with ${album.photoCount} photos` : ''
  const author = album.userDisplayName || album.username || 'Adventure Log User'

  return generateSEOMetadata({
    title: `${album.title} - Adventure Album by ${author}`,
    description: album.description ||
      `Explore ${album.title}${location}${dates}. A beautiful travel story${photoCountText} shared on Adventure Log.`,
    keywords: [
      'travel album',
      'adventure',
      'travel photos',
      'travel story',
      ...(album.location ? [album.location] : []),
      ...(album.tags || []),
    ],
    image: album.coverPhotoUrl || '/default-album-cover.jpg',
    imageAlt: `Cover photo for ${album.title} travel album`,
    url: `/albums/${album.id}`,
    type: 'article',
    publishedTime: album.startDate || undefined,
    modifiedTime: album.endDate || undefined,
    author: album.username,
    tags: album.tags || [],
  })
}

export function generateProfileSEOMetadata(profile: {
  username: string
  displayName?: string | null
  bio?: string | null
  location?: string | null
  avatarUrl?: string | null
  albumCount?: number
  photoCount?: number
}) {
  const displayName = profile.displayName || profile.username
  const location = profile.location ? ` from ${profile.location}` : ''
  const stats = profile.albumCount && profile.photoCount
    ? ` with ${profile.albumCount} albums and ${profile.photoCount} photos`
    : ''

  return generateSEOMetadata({
    title: `${displayName} (@${profile.username}) - Adventure Log Profile`,
    description: profile.bio ||
      `Discover ${displayName}'s travel adventures${location}. Follow their journey${stats} on Adventure Log.`,
    keywords: [
      'travel profile',
      'adventurer',
      'travel blogger',
      'travel photos',
      ...(profile.location ? [profile.location] : []),
    ],
    image: profile.avatarUrl || '/default-avatar.jpg',
    imageAlt: `${displayName}'s profile picture`,
    url: `/profile/${profile.username}`,
    type: 'profile',
    author: profile.username,
  })
}

export function generatePhotoSEOMetadata(photo: {
  id: string
  caption?: string | null
  location?: string | null
  takenAt?: string | null
  albumTitle?: string
  username?: string
  userDisplayName?: string | null
  photoUrl: string
}) {
  const author = photo.userDisplayName || photo.username || 'Adventure Log User'
  const location = photo.location ? ` in ${photo.location}` : ''
  const date = photo.takenAt ? ` taken on ${new Date(photo.takenAt).toLocaleDateString()}` : ''
  const album = photo.albumTitle ? ` from ${photo.albumTitle} album` : ''

  return generateSEOMetadata({
    title: photo.caption
      ? `"${photo.caption}" - Photo by ${author}`
      : `Adventure Photo by ${author}${location}`,
    description: photo.caption ||
      `Beautiful travel photo${location}${date}${album}. Shared by ${author} on Adventure Log.`,
    keywords: [
      'travel photo',
      'adventure photography',
      'travel memories',
      ...(photo.location ? [photo.location] : []),
    ],
    image: photo.photoUrl,
    imageAlt: photo.caption || `Travel photo by ${author}`,
    url: `/photos/${photo.id}`,
    type: 'article',
    publishedTime: photo.takenAt || undefined,
    author: photo.username,
  })
}

export function generateDiscoverSEOMetadata(params?: {
  location?: string
  category?: string
  timeframe?: string
}) {
  const { location, category } = params || {}

  let title = 'Discover Amazing Adventures'
  let description = 'Explore incredible travel stories, discover new destinations, and get inspired for your next adventure.'

  if (location) {
    title = `Discover Adventures in ${location}`
    description = `Explore amazing travel stories and adventures in ${location}. Get inspired for your next trip with real traveler experiences.`
  }

  if (category) {
    title = location
      ? `${category} Adventures in ${location}`
      : `${category} Adventures Around the World`
    description = `Discover incredible ${category.toLowerCase()} adventures${location ? ` in ${location}` : ''}. Browse real travel stories and get inspired.`
  }

  return generateSEOMetadata({
    title,
    description,
    keywords: [
      'travel discovery',
      'adventure inspiration',
      'travel destinations',
      'travel stories',
      ...(location ? [location] : []),
      ...(category ? [category.toLowerCase()] : []),
    ],
    url: '/discover',
    type: 'website',
  })
}

// Structured data generators for rich snippets

export function generateArticleStructuredData(article: {
  title: string
  description: string
  author: string
  authorUrl?: string
  publishedTime?: string
  modifiedTime?: string
  imageUrl?: string
  url: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.imageUrl ? `${baseUrl}${article.imageUrl}` : undefined,
    author: {
      '@type': 'Person',
      name: article.author,
      url: article.authorUrl ? `${baseUrl}${article.authorUrl}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Adventure Log',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    datePublished: article.publishedTime,
    dateModified: article.modifiedTime || article.publishedTime,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}${article.url}`,
    },
  }
}

export function generatePersonStructuredData(person: {
  name: string
  username: string
  bio?: string
  location?: string
  avatarUrl?: string
  websiteUrl?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    alternateName: person.username,
    description: person.bio,
    image: person.avatarUrl ? `${baseUrl}${person.avatarUrl}` : undefined,
    url: `${baseUrl}/profile/${person.username}`,
    sameAs: person.websiteUrl ? [person.websiteUrl] : undefined,
    ...(person.location && {
      homeLocation: {
        '@type': 'Place',
        name: person.location,
      },
    }),
  }
}

export function generateTravelGuideStructuredData(guide: {
  title: string
  description: string
  location: string
  author: string
  publishedTime?: string
  activities?: string[]
  imageUrl?: string
  url: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'TravelGuide',
    name: guide.title,
    description: guide.description,
    about: {
      '@type': 'Place',
      name: guide.location,
    },
    author: {
      '@type': 'Person',
      name: guide.author,
    },
    datePublished: guide.publishedTime,
    image: guide.imageUrl ? `${baseUrl}${guide.imageUrl}` : undefined,
    url: `${baseUrl}${guide.url}`,
    ...(guide.activities && {
      mentions: guide.activities.map(activity => ({
        '@type': 'Thing',
        name: activity,
      })),
    }),
  }
}