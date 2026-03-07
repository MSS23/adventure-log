'use client'

import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleAlbumCardProps {
  album: Album
  className?: string
}

export function SimpleAlbumCard({ album, className }: SimpleAlbumCardProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Album Image */}
      <Link href={`/albums/${album.id}`} className="block relative aspect-square overflow-hidden rounded-lg bg-gray-100 mb-3">
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </Link>

      {/* Album Info */}
      <div className="space-y-1 mb-3">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {album.title}
        </h3>
        {album.location_name && (
          <p className="text-sm text-gray-600 truncate">
            {album.location_name}
          </p>
        )}
      </div>

      {/* View Album Button */}
      <Link href={`/albums/${album.id}`} className="block">
        <button className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors">
          View Album
        </button>
      </Link>
    </div>
  )
}