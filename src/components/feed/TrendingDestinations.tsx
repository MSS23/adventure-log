'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

interface TrendingDestination {
  id: string
  title: string
  location: string
  country: string
  cover_image_url?: string
  photo_count: number
  likes_count: number
  latitude?: number
  longitude?: number
  user_id: string
}

export function TrendingDestinations() {
  const [destinations, setDestinations] = useState<TrendingDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchTrendingDestinations = async () => {
      try {
        // Fetch albums from the last 30 days, ordered by popularity (likes)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data, error } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            location_name,
            country_code,
            cover_photo_url,
            cover_image_url,
            latitude,
            longitude,
            user_id,
            created_at
          `)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) throw error

        // Format the data with proper photo URLs
        const formattedDestinations = data?.map((album) => {
          // Use cover_photo_url or cover_image_url directly
          let coverPhotoUrl = album.cover_photo_url || album.cover_image_url

          // If we have a storage path, convert it to full URL
          if (coverPhotoUrl && !coverPhotoUrl.startsWith('http')) {
            coverPhotoUrl = getPhotoUrl(coverPhotoUrl)
          }

          // Generate curated Unsplash fallback for albums without cover photos
          // Using specific collections and keywords for better quality
          const locationKeyword = album.location_name?.split(',')[0]?.trim() || 'travel'
          const unsplashFallback = `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&q=80`

          // Map common destinations to specific high-quality Unsplash images
          const destinationImages: Record<string, string> = {
            'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=400&fit=crop&q=80',
            'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop&q=80',
            'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=400&fit=crop&q=80',
            'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80',
            'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop&q=80',
            'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=400&fit=crop&q=80',
            'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop&q=80',
            'Sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=400&fit=crop&q=80',
            'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=400&fit=crop&q=80',
            'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=400&fit=crop&q=80',
            'Santorini': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400&h=400&fit=crop&q=80',
            'Maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=400&fit=crop&q=80',
          }

          const fallbackImage = destinationImages[locationKeyword] || unsplashFallback

          return {
            id: album.id,
            title: album.title,
            location: album.location_name || 'Unknown Location',
            country: album.country_code || 'Unknown',
            cover_image_url: coverPhotoUrl || fallbackImage,
            photo_count: 0, // Not needed for trending destinations display
            likes_count: 0, // Likes count not needed for display
            latitude: album.latitude,
            longitude: album.longitude,
            user_id: album.user_id
          }
        }) || []

        setDestinations(formattedDestinations)
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
      <div className="mb-8">
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
    <div className="mb-8">
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
            const imageUrl = destination.cover_image_url?.startsWith('http')
              ? destination.cover_image_url
              : getPhotoUrl(destination.cover_image_url || '')

            // All trending destinations should search for that location
            const searchQuery = destination.location.split(',')[0].trim()
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
                      alt={destination.title}
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

                  {/* Destination Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold drop-shadow-lg line-clamp-1">
                      {destination.location.split(',')[0]}
                    </p>
                    <p className="text-white/90 text-sm sm:text-xs drop-shadow-lg">
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