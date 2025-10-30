'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeaturedDestination {
  name: string
  country: string
  description: string
  imageUrl: string
  searchQuery?: string
}

interface FeaturedDestinationSectionProps {
  className?: string
}

// Featured destinations - can be rotated or fetched from a database
const featuredDestinations: FeaturedDestination[] = [
  {
    name: 'Amalfi Coast',
    country: 'Italy',
    description: 'Discover the breathtaking beauty of the Italian coastline, from charming villages to crystal-clear waters.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=900&fit=crop&q=80',
    searchQuery: 'Amalfi'
  },
  {
    name: 'Santorini',
    country: 'Greece',
    description: 'Experience breathtaking sunsets, whitewashed buildings, and crystal-clear waters in this iconic Greek island paradise.',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1600&h=900&fit=crop',
    searchQuery: 'Santorini'
  },
  {
    name: 'Kyoto',
    country: 'Japan',
    description: 'Immerse yourself in ancient temples, traditional gardens, and the timeless beauty of Japan\'s cultural heart.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&h=900&fit=crop',
    searchQuery: 'Kyoto'
  },
  {
    name: 'Patagonia',
    country: 'Argentina & Chile',
    description: 'Explore dramatic landscapes, towering glaciers, and pristine wilderness at the end of the world.',
    imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&h=900&fit=crop',
    searchQuery: 'Patagonia'
  }
]

export function FeaturedDestinationSection({ className }: FeaturedDestinationSectionProps) {
  // Rotate featured destination (could be based on date, random, or from database)
  const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const featuredIndex = currentWeek % featuredDestinations.length
  const destination = featuredDestinations[0] // Always show Amalfi Coast for consistency with design

  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl", className)}>
      {/* Background Image with Gradient Overlay */}
      <div className="relative h-[400px] md:h-[450px] w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${destination.imageUrl})`
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
          <div className="max-w-2xl space-y-3">
            {/* Location Name */}
            <h3 className="text-3xl md:text-4xl font-bold text-white">
              {destination.name}, {destination.country}
            </h3>

            {/* Description */}
            <p className="text-base md:text-lg text-white/90 max-w-xl">
              {destination.description}
            </p>

            {/* CTA Button */}
            <div className="pt-2">
              <Link href={`/search?q=${encodeURIComponent(destination.searchQuery || destination.name)}`}>
                <Button
                  size="default"
                  className="bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-md px-6"
                >
                  Explore Journeys
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
