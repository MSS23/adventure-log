'use client'

import { Album } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Camera, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleAlbumCardProps {
  album: Album
  className?: string
}

// City-only label (drop the country tail) so the overlay stays tight.
function getCityName(locationName?: string | null): string {
  if (!locationName) return ''
  return locationName.split(',')[0]?.trim() ?? ''
}

export function SimpleAlbumCard({ album, className }: SimpleAlbumCardProps) {
  const city = getCityName(album.location_name)

  return (
    <Link
      href={`/albums/${album.id}`}
      className={cn(
        'group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-resting)] transition-shadow duration-200 group-hover:shadow-[var(--shadow-hover)]">
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={{ objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%` }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Title + location overlaid on a bottom scrim — always legible on
            mobile, fades in on hover on desktop (matches the main Albums grid). */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-9 bg-gradient-to-t from-black/85 via-black/50 to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <h3 className="text-white font-heading font-semibold text-[13px] leading-tight line-clamp-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
            {album.title}
          </h3>
          {city && (
            <div className="flex items-center gap-1 text-white/85 text-[11px] leading-tight mt-0.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{city}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
