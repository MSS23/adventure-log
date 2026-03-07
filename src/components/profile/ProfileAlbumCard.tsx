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
    <Link href={`/albums/${album.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 24,
          delay: index * 0.05
        }}
        whileHover={{ y: -6 }}
        className={cn(
          'group relative aspect-[4/5] rounded-2xl overflow-hidden',
          'bg-gray-100 cursor-pointer',
          'shadow-sm hover:shadow-xl hover:shadow-teal-500/20',
          'ring-1 ring-gray-200/50 hover:ring-teal-300/50',
          'transition-all duration-300',
          className
        )}
      >
        {/* Image with zoom effect */}
        <motion.div
          className="absolute inset-0"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={album.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <Camera className="h-10 w-10 text-gray-400" />
            </div>
          )}
        </motion.div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 pointer-events-none">
          {/* Location badge */}
          {hasLocation && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full
                         bg-black/40 backdrop-blur-sm text-white text-xs font-medium"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full
                         bg-black/40 backdrop-blur-sm text-white text-xs font-medium"
            >
              <Camera className="h-3 w-3" />
              <span>{album.photos.length}</span>
            </motion.div>
          )}
        </div>

        {/* Gradient overlay - always visible at bottom, more on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent
                        opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 z-10">
          <motion.div
            initial={{ y: 10, opacity: 0.8 }}
            whileHover={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="font-bold text-white text-base sm:text-lg line-clamp-2 mb-1
                           drop-shadow-lg">
              {album.title}
            </h3>

            {date && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{date}</span>
              </div>
            )}
          </motion.div>

          {/* View button - appears on hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full
                            bg-white/20 backdrop-blur-sm border border-white/30
                            text-white text-sm font-medium
                            hover:bg-white/30 transition-colors">
              View Album
            </span>
          </motion.div>
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                        bg-gradient-to-r from-transparent via-white/10 to-transparent
                        -translate-x-full group-hover:translate-x-full
                        transition-transform duration-1000 ease-out pointer-events-none" />
      </motion.div>
    </Link>
  )
}
