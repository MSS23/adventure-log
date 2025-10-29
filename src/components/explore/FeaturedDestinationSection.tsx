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
  const destination = featuredDestinations[featuredIndex]

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl shadow-xl", className)}>
      {/* Background Image with Gradient Overlay */}
      <div className="relative h-[500px] w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${destination.imageUrl})`
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <div className="max-w-3xl space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <MapPin className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">Featured Destination</span>
            </div>

            {/* Location Name */}
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {destination.name}, {destination.country}
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl">
              {destination.description}
            </p>

            {/* CTA Button */}
            <div className="pt-4">
              <Link href={`/search?q=${encodeURIComponent(destination.searchQuery || destination.name)}`}>
                <Button
                  size="lg"
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                >
                  <span>Explore Journeys</span>
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute top-8 right-8 hidden md:block">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 border-2 border-white" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-white" />
            </div>
            <span className="text-sm font-medium text-white ml-2">
              Join thousands of travelers
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
