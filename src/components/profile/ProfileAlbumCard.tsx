'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { formatTravelDate } from '@/lib/utils/travel-date'
import { Camera, MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileAlbumCardProps {
  album: Album
  className?: string
  index?: number
}

export function ProfileAlbumCard({ album, className, index = 0 }: ProfileAlbumCardProps) {
  const coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)
  const hasLocation = album.location_name || album.location_city
  const location = album.location_city || album.location_name?.split(',')[0]

  // Album dates read as seasons (e.g. "Summer 2025"), hemisphere-aware via
  // the album's latitude. Returns '' for missing/invalid dates.
  const date = formatTravelDate(album.date_start, {
    view: 'fuzzy',
    latitude: album.latitude ?? undefined,
  })

  return (
    <Link
      href={`/albums/${album.id}`}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 24,
          delay: index * 0.05
        }}
        whileHover={{ y: -2 }}
        className={cn(
          'group relative aspect-[4/3] rounded-2xl overflow-hidden',
          'bg-muted border border-border cursor-pointer',
          'transition-all duration-200 hover:border-primary/30 hover:shadow-md',
          className
        )}
      >
        {/* Cover image */}
        <div className="absolute inset-0">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              style={{ objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%` }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 pointer-events-none">
          {/* Location badge */}
          {hasLocation && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-black/60 backdrop-blur-sm text-white text-xs font-medium"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[100px]">{location}</span>
            </motion.div>
          )}

          {/* Photo count badge */}
          {album.photos && album.photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-black/60 backdrop-blur-sm text-white text-xs font-medium"
            >
              <Camera className="h-3 w-3 shrink-0" />
              <span>{album.photos.length}</span>
            </motion.div>
          )}
        </div>

        {/* Scrim — taller, darker gradient so the title stays legible even on
            bright or busy cover photos. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
        />

        {/* Content overlay — title + date only. No hover CTA: the whole card
            is a link, and a reserved button row used to push the title up the
            card until it collided with the top badges on small grid cells. */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-10">
          <h3 className="font-heading font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 [text-shadow:0_2px_6px_rgba(0,0,0,0.85)]">
            {album.title}
          </h3>

          {date && (
            <div className="mt-1 flex items-center gap-1.5 text-white/90 text-xs font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,0.85)]">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{date}</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
