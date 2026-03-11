'use client'

import { memo } from 'react'
import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { MapPin, Camera, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AlbumCardProps {
  album: Album
  className?: string
  index?: number
}

export const AlbumCard = memo(function AlbumCard({ album, className, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      className={cn("bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-olive-100 dark:border-white/[0.06] overflow-hidden group", className)}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.08
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 20px 40px -12px rgba(74, 93, 35, 0.12)'
      }}
    >
      {/* Album Image */}
      <Link href={`/albums/${album.id}`} className="block relative aspect-[4/3] overflow-hidden bg-olive-50 dark:bg-[#0A0A0A]">
        {album.cover_photo_url ? (
          <motion.div
            className="w-full h-full"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive-50 to-olive-100 dark:from-[#111111] dark:to-[#1A1A1A]">
            <motion.div
              whileHover={{ scale: 1.2, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Camera className="h-10 w-10 text-olive-300 dark:text-olive-700" />
            </motion.div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Album Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-base line-clamp-2 drop-shadow-lg">
            {album.title}
          </h3>
          {album.location_name && (
            <p className="text-white/80 text-xs flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{album.location_name}</span>
            </p>
          )}
        </div>
      </Link>

      {/* Album Action */}
      <div className="p-3">
        <Link href={`/albums/${album.id}`} className="block">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View Album
            </Button>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
})
