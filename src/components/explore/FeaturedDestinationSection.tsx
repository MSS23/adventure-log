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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
        {/* Background Image */}
        <div className="relative h-[240px] sm:h-[320px] md:h-[400px] w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
            style={{
              backgroundImage: `url(${destination.imageUrl})`
            }}
          />

          {/* Scrim for text legibility */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <div className="h-2 w-2 rounded-full" style={{ background: 'var(--color-gold-soft)' }} />
                <span className="font-mono text-xs font-medium uppercase tracking-wider text-white/90">
                  Featured This Week
                </span>
              </div>

              {/* Location Name */}
              <div className="space-y-1">
                <h3 className="al-display text-2xl sm:text-3xl md:text-4xl !text-white leading-tight drop-shadow-sm">
                  {destination.name}
                </h3>
                <p className="text-base sm:text-lg text-white/90 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {destination.country}
                </p>
              </div>

              {/* Description */}
              <p className="text-sm md:text-base text-white/90 max-w-xl leading-relaxed">
                {destination.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href={`/search?q=${encodeURIComponent(destination.searchQuery || destination.name)}`}>
                  <Button variant="coral" size="default">
                    <span className="flex items-center gap-2">
                      Explore Journeys
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                </Link>

                <Button
                  size="pill"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white hover:border-white/40"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-6 right-6 hidden md:block">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
              <div className="flex -space-x-1.5">
                <div className="h-6 w-6 rounded-full border-2 border-white" style={{ background: 'var(--color-forest-soft)' }} />
                <div className="h-6 w-6 rounded-full border-2 border-white" style={{ background: 'var(--color-gold-soft)' }} />
                <div className="h-6 w-6 rounded-full border-2 border-white" style={{ background: 'var(--color-coral-soft)' }} />
              </div>
              <span className="ml-1 text-xs font-medium text-white/90">
                234 travelers visited
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
