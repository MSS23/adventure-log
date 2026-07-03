'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Globe, Users, User as UserIcon, Layers, Camera } from 'lucide-react'
import { usePlaces, type PlacesScope } from '@/lib/hooks/usePlaces'
import { FriendsNearby } from '@/components/places/FriendsNearby'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getFlagEmoji, getCityName } from '@/lib/utils/country'
import { AnimatedSkeleton } from '@/components/ui/AnimatedSkeleton'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { PlaceGroup } from '@/lib/utils/places'

const SCOPES: Array<{ key: PlacesScope; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'you', label: 'Where you’ve been', icon: UserIcon },
  { key: 'friends', label: 'Where friends have been', icon: Users },
  { key: 'everyone', label: 'Everyone', icon: Globe },
]

function PlaceCard({ place }: { place: PlaceGroup }) {
  const cover = getPhotoUrl(place.coverPhotoUrl)
  const flag = place.country_code ? getFlagEmoji(place.country_code) : ''
  const city = getCityName(place.name) || place.name

  return (
    <Link
      href={`/places/${place.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={place.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1.5 text-white">
            {flag && <span className="text-base leading-none">{flag}</span>}
            <span className="truncate text-sm font-semibold drop-shadow">{city}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/85">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {place.albumCount} {place.albumCount === 1 ? 'album' : 'albums'}
            </span>
            {place.contributorIds.length > 1 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {place.contributorIds.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function PlacesPage() {
  const [scope, setScope] = useState<PlacesScope>('you')
  const { places, stats, loading } = usePlaces(scope)

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="al-eyebrow text-muted-foreground">Location</p>
          <h1 className="al-display text-3xl sm:text-4xl leading-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" />
            Places
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Every spot you and your friends have logged — tap a place to see all the albums pinned there.
          </p>
        </motion.div>

        {/* Scope toggle */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SCOPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                scope === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={scope === key}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Friends who have been near you or your pinned spots */}
        <FriendsNearby />

        {/* Stats */}
        {!loading && places.length > 0 && (
          <div className="mt-5 flex items-center gap-5 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{stats.placeCount}</strong> {stats.placeCount === 1 ? 'place' : 'places'}</span>
            <span><strong className="text-foreground">{stats.countryCount}</strong> {stats.countryCount === 1 ? 'country' : 'countries'}</span>
            <span><strong className="text-foreground">{stats.albumCount}</strong> {stats.albumCount === 1 ? 'album' : 'albums'}</span>
          </div>
        )}

        {/* Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <AnimatedSkeleton key={i} className="aspect-[4/3] w-full rounded-2xl" variant="rounded" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {scope === 'you'
                  ? 'No places yet'
                  : scope === 'friends'
                    ? 'No friend places yet'
                    : 'Nothing to explore yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {scope === 'you'
                  ? 'Add a location to your albums and they’ll show up here on your map.'
                  : scope === 'friends'
                    ? 'Follow more travelers to see where they’ve been.'
                    : 'Check back soon — public adventures will appear here.'}
              </p>
              {scope === 'you' && (
                <Link
                  href="/albums/new"
                  className="al-btn-accent mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                >
                  New album
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {places.map((place) => (
                <PlaceCard key={place.slug} place={place} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
