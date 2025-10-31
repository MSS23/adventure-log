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
  const destination = featuredDestinations[featuredIndex] // Rotate through destinations weekly

  return (
    <div className={cn("relative w-full group", className)}>
      <div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-500">
        {/* Background Image with Ken Burns effect on hover */}
        <div className="relative h-[360px] md:h-[420px] w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-110 transition-transform duration-[8s] ease-out"
            style={{
              backgroundImage: `url(${destination.imageUrl})`
            }}
          />

          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <div className="max-w-2xl space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <div className="h-2 w-2 bg-teal-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-white/90 uppercase tracking-wider">
                  Featured This Week
                </span>
              </div>

              {/* Location Name */}
              <div className="space-y-1">
                <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {destination.name}
                </h3>
                <p className="text-lg md:text-xl text-white/90 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {destination.country}
                </p>
              </div>

              {/* Description */}
              <p className="text-sm md:text-base text-white/85 max-w-xl leading-relaxed">
                {destination.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href={`/search?q=${encodeURIComponent(destination.searchQuery || destination.name)}`}>
                  <Button
                    size="default"
                    className="bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg px-6 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      Explore Journeys
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                </Link>

                <Button
                  size="default"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-medium rounded-lg px-5 shadow-lg"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-6 right-6 hidden md:block">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
              <div className="flex -space-x-1.5">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 border-2 border-white" />
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white" />
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-white" />
              </div>
              <span className="text-xs text-white/90 font-medium ml-1">
                234 travelers visited
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
