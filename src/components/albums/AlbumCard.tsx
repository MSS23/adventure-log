'use client'

import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { MapPin, Camera, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AlbumCardProps {
  album: Album
  className?: string
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden group hover:shadow-xl transition-all duration-300", className)}>
      {/* Album Image */}
      <Link href={`/albums/${album.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Album Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-base truncate">
            {album.title}
          </h3>
        </div>
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
          <Button
            variant="outline"
            size="sm"
            className="w-full border-teal-500 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-600 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Album
          </Button>
        </Link>
      </div>
    </div>
  )
}
