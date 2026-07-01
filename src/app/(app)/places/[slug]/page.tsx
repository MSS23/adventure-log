'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Layers, Users, Check, Camera, Globe as GlobeIcon } from 'lucide-react'
import { useLocationFeed, type LocationFeedAlbum } from '@/lib/hooks/usePlaces'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName } from '@/lib/utils/display-name'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AnimatedSkeleton } from '@/components/ui/AnimatedSkeleton'
import { BackButton } from '@/components/common/BackButton'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

function FeedAlbumCard({ album }: { album: LocationFeedAlbum }) {
  const cover = getPhotoUrl(album.cover_photo_url)
  const owner = album.owner
  const displayName = getDisplayName(owner?.display_name, owner?.username)

  return (
    <Link
      href={`/albums/${album.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="truncate text-sm font-semibold text-white drop-shadow">{album.title}</p>
          {owner && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Avatar className="h-5 w-5 ring-1 ring-white/40">
                <AvatarImage src={getAvatarUrl(owner.avatar_url, owner.username ?? undefined)} />
                <AvatarFallback className="bg-primary/20 text-[8px] text-white">
                  {displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[11px] text-white/85">{displayName}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function LocationFeedPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const { data, loading } = useLocationFeed(slug)

  const flag = data?.countryCode ? getFlagEmoji(data.countryCode) : ''
  const countryName = data?.countryCode ? getCountryName(data.countryCode) : ''

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        <BackButton fallbackRoute="/places" />

        {loading ? (
          <div className="mt-6 space-y-6">
            <AnimatedSkeleton className="h-10 w-64 rounded" variant="rounded" />
            <AnimatedSkeleton className="h-4 w-40 rounded" variant="rounded" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(6)].map((_, i) => (
                <AnimatedSkeleton key={i} className="aspect-square w-full rounded-2xl" variant="rounded" />
              ))}
            </div>
          </div>
        ) : !data || data.albums.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">No albums here yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              There aren’t any albums you can see at this location right now.
            </p>
            <Link href="/places" className="mt-5">
              <Button variant="outline">Back to Places</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Location header */}
            <motion.div
              className="mt-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {flag ? <span className="text-2xl leading-none">{flag}</span> : <MapPin className="h-6 w-6" />}
                </div>
                <div className="min-w-0">
                  <h1 className="al-display text-2xl sm:text-3xl leading-tight">{data.name}</h1>
                  {countryName && (
                    <p className="text-sm text-muted-foreground">{countryName}</p>
                  )}
                </div>
              </div>

              {/* Stats + "you were here" */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{data.albums.length}</strong>
                  {data.albums.length === 1 ? 'album' : 'albums'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{data.contributorCount}</strong>
                  {data.contributorCount === 1 ? 'traveler' : 'travelers'}
                </span>
                {data.youHaveBeen && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Check className="h-3.5 w-3.5" />
                    You’ve been here
                  </span>
                )}
                {data.latitude != null && data.longitude != null && (
                  <Link
                    href={`/globe?lat=${data.latitude}&lng=${data.longitude}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <GlobeIcon className="h-4 w-4" />
                    View on globe
                  </Link>
                )}
              </div>
            </motion.div>

            {/* Album feed */}
            <motion.div
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {data.albums.map((album) => (
                <FeedAlbumCard key={album.id} album={album} />
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
