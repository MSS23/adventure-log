'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
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

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const date = formatDate(album.date_start)

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
                         bg-black/55 text-white text-xs font-medium"
            >
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{location}</span>
            </motion.div>
          )}

          {/* Photo count badge */}
          {album.photos && album.photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-black/55 text-white text-xs font-medium"
            >
              <Camera className="h-3 w-3" />
              <span>{album.photos.length}</span>
            </motion.div>
          )}
        </div>

        {/* Scrim — keeps overlay text legible on any photo */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
        />

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 z-10">
          <h3 className="font-heading font-semibold text-white text-base sm:text-lg line-clamp-2 mb-1 drop-shadow-sm">
            {album.title}
          </h3>

          {date && (
            <div className="flex items-center gap-1.5 text-white/90 text-xs">
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </div>
          )}

          {/* View button - appears on hover */}
          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="inline-flex items-center px-4 py-2 rounded-full
                            bg-white/15 border border-white/40
                            text-white text-sm font-medium
                            hover:bg-white/25 transition-colors">
              View Album
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
