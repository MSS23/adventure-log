'use client'

import { memo } from 'react'
import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { MapPin, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlbumCardProps {
  album: Album
  className?: string
  index?: number
}

export const AlbumCard = memo(function AlbumCard({ album, className, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      className={cn("group", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.06
      }}
    >
      <Link
        href={`/albums/${album.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Image container */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted transition-shadow duration-200 group-hover:shadow-md">
          {album.cover_photo_url ? (
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          {/* Scrim */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-heading font-semibold text-[15px] line-clamp-2 drop-shadow-sm leading-snug">
              {album.title}
            </h3>
            {album.location_name && (
              <p className="text-white/90 text-xs flex items-center gap-1 mt-1.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{album.location_name}</span>
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
})
