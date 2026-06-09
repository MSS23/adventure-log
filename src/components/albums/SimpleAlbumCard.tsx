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
      <Link href={`/albums/${album.id}`} className="block relative aspect-square overflow-hidden rounded-lg bg-stone-100 dark:bg-white/[0.06] mb-3">
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 dark:from-white/[0.06] to-stone-200 dark:to-white/[0.08]">
            <Camera className="h-12 w-12 text-stone-400 dark:text-stone-500" />
          </div>
        )}
      </Link>

      {/* Album Info */}
      <div className="space-y-1 mb-3">
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
          {album.title}
        </h3>
        {album.location_name && (
          <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
            {album.location_name}
          </p>
        )}
      </div>

      {/* View Album Button */}
      <Link href={`/albums/${album.id}`} className="block">
        <button className="al-btn-coral w-full px-4 py-2 font-medium">
          View Album
        </button>
      </Link>
    </div>
  )
}