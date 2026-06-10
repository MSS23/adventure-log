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
      <Link href={`/albums/${album.id}`} className="group block relative aspect-square overflow-hidden rounded-2xl bg-muted mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </Link>

      {/* Album Info */}
      <div className="space-y-1 mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground truncate">
          {album.title}
        </h3>
        {album.location_name && (
          <p className="text-sm text-muted-foreground truncate">
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