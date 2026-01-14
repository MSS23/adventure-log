'use client'

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

export function AlbumCard({ album, className, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      className={cn("bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group", className)}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.08
      }}
      whileHover={{
        y: -6,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* Album Image */}
      <Link href={`/albums/${album.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
        {album.cover_photo_url ? (
          <motion.div
            className="w-full h-full"
            whileHover={{ scale: 1.08 }}
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <motion.div
              whileHover={{ scale: 1.2, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Camera className="h-12 w-12 text-gray-400" />
            </motion.div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Album Title Overlay */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-4"
          initial={{ y: 10, opacity: 0.8 }}
          whileHover={{ y: 0, opacity: 1 }}
        >
          <h3 className="text-white font-bold text-base line-clamp-2 drop-shadow-lg">
            {album.title}
          </h3>
        </motion.div>
      </Link>

      {/* Album Info and Button */}
      <div className="p-4 space-y-3">
        {album.location_name && (
          <p className="text-gray-600 text-sm flex items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{album.location_name}</span>
          </p>
        )}

        <Link href={`/albums/${album.id}`} className="block">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full border-teal-500 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-600 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Album
            </Button>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
}
