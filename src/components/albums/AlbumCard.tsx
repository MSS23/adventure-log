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
      <Link href={`/albums/${album.id}`} className="block">
        {/* Image container */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900">
          {album.cover_photo_url ? (
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800">
              <Camera className="h-10 w-10 text-stone-300 dark:text-stone-700" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-[15px] line-clamp-2 drop-shadow-sm leading-snug">
              {album.title}
            </h3>
            {album.location_name && (
              <p className="text-white/70 text-xs flex items-center gap-1 mt-1.5">
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
