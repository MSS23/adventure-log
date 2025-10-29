'use client'

import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { MapPin, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlbumCardProps {
  album: Album
  className?: string
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <Link href={`/albums/${album.id}`} className={cn("block group", className)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
        {/* Album Image */}
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Album Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-base mb-1 truncate">
            {album.title}
          </h3>
          {album.location_name && (
            <p className="text-white/90 text-sm flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{album.location_name}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
