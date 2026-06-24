'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ArrowRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface FeaturedDestination {
  key: string
  name: string
  country: string
  description: string
  imageUrl: string
  searchQuery: string
  travelers: number
}

interface FeaturedDestinationSectionProps {
  className?: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Fallback used only when there isn't enough real data yet (brand-new install).
const FALLBACKS: FeaturedDestination[] = [
  {
    key: 'kyoto, japan',
    name: 'Kyoto',
    country: 'Japan',
    description: 'Ancient temples, traditional gardens, and the timeless beauty of Japan\'s cultural heart.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&h=900&fit=crop',
    searchQuery: 'Kyoto',
    travelers: 0,
  },
  {
    key: 'amalfi coast, italy',
    name: 'Amalfi Coast',
    country: 'Italy',
    description: 'Charming cliffside villages and crystal-clear waters along the Italian coastline.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=900&fit=crop&q=80',
    searchQuery: 'Amalfi',
    travelers: 0,
  },
]

type AlbumRow = {
  location_name: string | null
  country_code: string | null
  cover_photo_url: string | null
  cover_image_url: string | null
  user_id: string
}

function splitLocation(locationName: string, countryCode: string | null): { name: string; country: string } {
  const parts = locationName.split(',').map((p) => p.trim()).filter(Boolean)
  const name = parts[0] || locationName.trim()
  const country = parts.length > 1 ? parts[parts.length - 1] : (countryCode ? countryCode.toUpperCase() : '')
  return { name, country }
}

/**
 * Rank public locations by how many distinct travelers logged them, then by
 * album count. Returns most-popular first.
 */
function rankLocations(rows: AlbumRow[]): FeaturedDestination[] {
  const groups = new Map<string, { name: string; country: string; users: Set<string>; albums: number; image: string }>()

  for (const row of rows) {
    if (!row.location_name) continue
    const key = row.location_name.trim().toLowerCase()
    if (!key) continue

    let g = groups.get(key)
    if (!g) {
      const { name, country } = splitLocation(row.location_name, row.country_code)
      g = { name, country, users: new Set(), albums: 0, image: '' }
      groups.set(key, g)
    }
    g.users.add(row.user_id)
    g.albums += 1
    if (!g.image) {
      const url = getPhotoUrl(row.cover_photo_url || row.cover_image_url)
      if (url) g.image = url
    }
  }

  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      name: g.name,
      country: g.country,
      description: `Trending this week — ${g.users.size} ${g.users.size === 1 ? 'traveler has' : 'travelers have'} been logging adventures in ${g.name}.`,
      imageUrl: g.image,
      searchQuery: g.name,
      travelers: g.users.size,
    }))
    // A spotlight needs a photo to look good; drop locations without one.
    .filter((d) => d.imageUrl)
    .sort((a, b) => b.travelers - a.travelers || b.searchQuery.localeCompare(a.searchQuery))
}

export function FeaturedDestinationSection({ className }: FeaturedDestinationSectionProps) {
  const { data: ranked = [] } = useQuery<FeaturedDestination[]>({
    queryKey: ['featured-destination'],
    staleTime: 60 * 60 * 1000, // 1h — it's a weekly spotlight, no need to refetch often
    queryFn: async () => {
      const supabase = createClient()
      const sinceWeek = new Date(Date.now() - WEEK_MS).toISOString()

      const select =
        'location_name, country_code, cover_photo_url, cover_image_url, user_id, users!albums_user_id_fkey!inner(privacy_level)'
      const base = () =>
        supabase
          .from('albums')
          .select(select)
          .eq('visibility', 'public')
          .eq('users.privacy_level', 'public')
          .not('location_name', 'is', null)
          .neq('status', 'draft')

      // Most popular *this week*; if the app is quiet this week, fall back to
      // all-time so the spotlight is never empty.
      let { data } = await base().gte('created_at', sinceWeek).limit(500)
      if (!data || data.length === 0) {
        ;({ data } = await base().order('created_at', { ascending: false }).limit(500))
      }
      return rankLocations((data || []) as AlbumRow[])
    },
  })

  // Pick the spotlight: most popular this week, but if that's the same location
  // we featured last week, show the next-most-popular instead (no repeats).
  const destination = useMemo<FeaturedDestination | null>(() => {
    const list = ranked.length > 0 ? ranked : FALLBACKS.filter((f) => f.imageUrl)
    if (list.length === 0) return null

    const currentWeek = Math.floor(Date.now() / WEEK_MS)
    let lastKey: string | null = null
    let lastWeek = -1
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('al_featured_destination') : null
      if (raw) {
        const parsed = JSON.parse(raw) as { key: string; week: number }
        lastKey = parsed.key
        lastWeek = parsed.week
      }
    } catch {
      /* ignore malformed storage */
    }

    let chosen = list[0]
    // Only rotate when a new week starts; stay stable within the same week.
    if (lastWeek !== currentWeek && lastKey && chosen.key === lastKey && list.length > 1) {
      chosen = list[1]
    } else if (lastWeek === currentWeek && lastKey) {
      // Within the same week, keep whatever we settled on (if still present).
      chosen = list.find((d) => d.key === lastKey) || chosen
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'al_featured_destination',
          JSON.stringify({ key: chosen.key, week: currentWeek })
        )
      }
    } catch {
      /* ignore */
    }

    return chosen
  }, [ranked])

  if (!destination) return null

  return (
    <div className={cn('relative w-full group', className)}>
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
                {destination.country && (
                  <p className="text-base sm:text-lg text-white/90 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {destination.country}
                  </p>
                )}
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
              </div>
            </div>
          </div>

          {/* Real traveler count for this location */}
          {destination.travelers > 0 && (
            <div className="absolute top-6 right-6 hidden md:block">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <span className="text-xs font-medium text-white/90">
                  {destination.travelers} {destination.travelers === 1 ? 'traveler' : 'travelers'} logged this
                </span>
              </div>
            </div>
          )}

          {/* Attribution when we're showing a stock fallback image. */}
          {destination.imageUrl.includes('unsplash.com') && (
            <div className="absolute bottom-2 right-3 text-[10px] text-white/70 drop-shadow">
              Photo via{' '}
              <a
                href="https://unsplash.com?utm_source=adventure_log&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Unsplash
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
