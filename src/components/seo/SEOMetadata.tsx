import { Metadata } from 'next'

interface SEOMetadataProps {
  title: string
  description: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  tags?: string[]
}

const APP_NAME = 'Adventure Log'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.app'
const DEFAULT_OG_IMAGE = `${APP_URL}/og-image.png`

export function generateSEOMetadata({
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  tags = []
}: SEOMetadataProps): Metadata {
  const fullTitle = title ? `${title} | ${APP_NAME}` : APP_NAME
  const fullUrl = url ? `${APP_URL}${url}` : APP_URL

  return {
    title: fullTitle,
    description,
    applicationName: APP_NAME,
    keywords: ['travel', 'photography', 'adventure', 'travel log', 'photo album', ...tags],
    authors: author ? [{ name: author }] : undefined,
    creator: APP_NAME,
    publisher: APP_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(APP_URL),
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: APP_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: type,
      ...(type === 'article' && publishedTime ? {
        publishedTime,
        modifiedTime,
        authors: author ? [author] : undefined,
        tags
      } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@adventurelog',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Generate metadata for album pages
 */
export function generateAlbumMetadata({
  albumTitle,
  albumDescription,
  coverImage,
  albumId,
  username,
  location,
  dateStart
}: {
  albumTitle: string
  albumDescription?: string
  coverImage?: string
  albumId: string
  username?: string
  location?: string
  dateStart?: string
}): Metadata {
  const description = albumDescription || `A travel album by ${username || 'an adventurer'}`
  const tags = [location, username].filter(Boolean) as string[]

  return generateSEOMetadata({
    title: albumTitle,
    description,
    image: coverImage,
    url: `/albums/${albumId}`,
    type: 'article',
    publishedTime: dateStart,
    author: username,
    tags
  })
}

/**
 * Generate metadata for user profile pages
 */
export function generateProfileMetadata({
  username,
  displayName,
  bio,
  avatar,
  userId,
  stats
}: {
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  userId: string
  stats?: {
    albums: number
    photos: number
    countries: number
  }
}): Metadata {
  const name = displayName || username
  const description = bio ||
    `${name} on Adventure Log${stats ? ` - ${stats.albums} albums, ${stats.photos} photos, ${stats.countries} countries visited` : ''}`

  return generateSEOMetadata({
    title: name,
    description,
    image: avatar,
    url: `/profile/${userId}`,
    type: 'profile',
    tags: [username]
  })
}

/**
 * JSON-LD structured data for rich results
 */
export function generateAlbumStructuredData({
  albumTitle,
  albumDescription,
  coverImage,
  albumId,
  username,
  location,
  dateStart,
  photos
}: {
  albumTitle: string
  albumDescription?: string
  coverImage?: string
  albumId: string
  username?: string
  location?: string
  dateStart?: string
  photos?: Array<{ url: string; caption?: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: albumTitle,
    description: albumDescription,
    image: coverImage,
    url: `${APP_URL}/albums/${albumId}`,
    author: {
      '@type': 'Person',
      name: username
    },
    datePublished: dateStart,
    contentLocation: location ? {
      '@type': 'Place',
      name: location
    } : undefined,
    associatedMedia: photos?.map(photo => ({
      '@type': 'ImageObject',
      url: photo.url,
      caption: photo.caption
    }))
  }
}

export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    url: APP_URL,
    description: 'Share your travel adventures with beautiful photo albums on an interactive 3D globe',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${APP_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${APP_URL}${item.url}`
    }))
  }
}
