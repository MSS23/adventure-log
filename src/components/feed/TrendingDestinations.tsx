'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

interface TrendingDestination {
  id: string
  location: string        // City name (first part of location_name)
  fullLocation: string    // Full location_name for search
  country: string
  cover_image_url: string
  visit_count: number     // Number of albums at this location
  engagement_count: number // Total likes + reactions + comments
  popularity_score: number
  latitude?: number
  longitude?: number
}

// Helper to count occurrences by target_id
function countByTargetId(items: { target_id: string }[]): Map<string, number> {
  const map = new Map<string, number>()
  items.forEach(item => {
    map.set(item.target_id, (map.get(item.target_id) || 0) + 1)
  })
  return map
}

// Calculate popularity score with weighted metrics
function calculatePopularityScore(
  likes: number,
  reactions: number,
  comments: number,
  visits: number
): number {
  return (likes * 2) + (reactions * 1.5) + (comments * 3) + (visits * 5)
}

// Get fallback image for a location
function getFallbackImage(locationKeyword: string): string {
  const destinationImages: Record<string, string> = {
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=400&fit=crop&q=80',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop&q=80',
    'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=400&fit=crop&q=80',
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80',
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop&q=80',
    'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=400&fit=crop&q=80',
    'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop&q=80',
    'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=400&fit=crop&q=80',
    'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=400&fit=crop&q=80',
    'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=400&fit=crop&q=80',
    'santorini': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400&h=400&fit=crop&q=80',
    'maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=400&fit=crop&q=80',
  }

  const normalizedKeyword = locationKeyword.toLowerCase()
  return destinationImages[normalizedKeyword] ||
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&q=80'
}

export function TrendingDestinations() {
  const [destinations, setDestinations] = useState<TrendingDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchTrendingDestinations = async () => {
      try {
        // Fetch PUBLIC albums from the last 90 days with location data
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

        const { data: albums, error: albumsError } = await supabase
          .from('albums')
          .select('id, title, location_name, country_code, cover_photo_url, cover_image_url, latitude, longitude')
          .eq('visibility', 'public')
          .not('location_name', 'is', null)
          .gte('created_at', ninetyDaysAgo)
          .limit(100)

        if (albumsError) throw albumsError

        if (!albums || albums.length === 0) {
          setDestinations([])
          setLoading(false)
          return
        }

        const albumIds = albums.map(a => a.id)

        // Batch fetch engagement data in parallel
        const [likesRes, reactionsRes, commentsRes] = await Promise.all([
          supabase
            .from('likes')
            .select('target_id')
            .eq('target_type', 'album')
            .in('target_id', albumIds),
          supabase
            .from('reactions')
            .select('target_id')
            .eq('target_type', 'album')
            .in('target_id', albumIds),
          supabase
            .from('comments')
            .select('target_id')
            .eq('target_type', 'album')
            .in('target_id', albumIds)
        ])

        // Build engagement maps
        const likesMap = countByTargetId(likesRes.data || [])
        const reactionsMap = countByTargetId(reactionsRes.data || [])
        const commentsMap = countByTargetId(commentsRes.data || [])

        // Group albums by city (first part of location_name) + country
        const locationGroups = new Map<string, typeof albums>()

        albums.forEach(album => {
          const city = album.location_name!.split(',')[0].trim().toLowerCase()
          const key = `${city}-${(album.country_code || 'unknown').toLowerCase()}`

          if (!locationGroups.has(key)) {
            locationGroups.set(key, [])
          }
          locationGroups.get(key)!.push(album)
        })

        // Calculate popularity scores for each location
        const locations: TrendingDestination[] = []

        locationGroups.forEach((groupAlbums) => {
          let totalLikes = 0
          let totalReactions = 0
          let totalComments = 0
          let bestAlbum = groupAlbums[0]
          let bestScore = 0

          groupAlbums.forEach(album => {
            const likes = likesMap.get(album.id) || 0
            const reactions = reactionsMap.get(album.id) || 0
            const comments = commentsMap.get(album.id) || 0

            totalLikes += likes
            totalReactions += reactions
            totalComments += comments

            // Track album with highest individual engagement for cover
            const albumScore = likes + reactions + comments
            if (albumScore > bestScore) {
              bestScore = albumScore
              bestAlbum = album
            }
          })

          const score = calculatePopularityScore(
            totalLikes,
            totalReactions,
            totalComments,
            groupAlbums.length
          )

          const city = groupAlbums[0].location_name!.split(',')[0].trim()

          // Get cover image from best album or use fallback
          let coverUrl = bestAlbum.cover_photo_url || bestAlbum.cover_image_url
          if (coverUrl && !coverUrl.startsWith('http')) {
            coverUrl = getPhotoUrl(coverUrl)
          }

          locations.push({
            id: `${city.toLowerCase()}-${(groupAlbums[0].country_code || 'unknown').toLowerCase()}`,
            location: city,
            fullLocation: groupAlbums[0].location_name!,
            country: groupAlbums[0].country_code || 'Unknown',
            cover_image_url: coverUrl || getFallbackImage(city),
            visit_count: groupAlbums.length,
            engagement_count: totalLikes + totalReactions + totalComments,
            popularity_score: score,
            latitude: groupAlbums[0].latitude,
            longitude: groupAlbums[0].longitude
          })
        })

        // Sort by popularity score descending, take top 8
        locations.sort((a, b) => b.popularity_score - a.popularity_score)
        setDestinations(locations.slice(0, 8))

        log.info('Trending destinations loaded', {
          component: 'TrendingDestinations',
          action: 'fetch',
          count: locations.length,
          topScore: locations[0]?.popularity_score
        })
      } catch (error) {
        log.error('Failed to fetch trending destinations', { component: 'TrendingDestinations', action: 'fetch' }, error as Error)
        setDestinations([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingDestinations()
  }, [supabase])

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('trending-destinations-scroll')
    if (!container) return

    const scrollAmount = 300
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount

    container.scrollTo({ left: newPosition, behavior: 'smooth' })
    setScrollPosition(newPosition)
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Trending Destinations</h2>
          <Link href="/search" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            See All
          </Link>
        </div>
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px]">
              <div className="w-full h-[140px] bg-gray-200 rounded-xl animate-pulse" />
              <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (destinations.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Trending Destinations</h2>
        <Link href="/search" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          See All
        </Link>
      </div>

      <div className="relative group">
        {/* Left Arrow */}
        {scrollPosition > 0 && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
        )}

        {/* Destinations Container */}
        <div
          id="trending-destinations-scroll"
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
        >
          {destinations.map((destination) => {
            const imageUrl = destination.cover_image_url

            // Search for the location name
            const searchQuery = destination.location
            const href = `/search?q=${encodeURIComponent(searchQuery)}`

            return (
              <Link
                key={destination.id}
                href={href}
                className="flex-shrink-0 group/card"
              >
                <div className="relative w-[140px] h-[140px] rounded-xl overflow-hidden bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${destination.location}, ${destination.country}`}
                      fill
                      className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                      sizes="140px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {destination.location.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Engagement Badge - top right */}
                  {destination.engagement_count > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1
                                    px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm
                                    text-white text-xs font-medium">
                      <Heart className="h-3 w-3 fill-current" />
                      <span>{destination.engagement_count}</span>
                    </div>
                  )}

                  {/* Destination Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold drop-shadow-lg line-clamp-1">
                      {destination.location}
                    </p>
                    <p className="text-white/90 text-xs sm:text-sm drop-shadow-lg">
                      {destination.country}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </div>
  )
}