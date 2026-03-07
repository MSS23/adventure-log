'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { Photo } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'

interface ThumbnailStripProps {
  photos: Photo[]
  currentIndex: number
  onThumbnailClick: (index: number) => void
  className?: string
}

export function ThumbnailStrip({
  photos,
  currentIndex,
  onThumbnailClick,
  className
}: ThumbnailStripProps) {
  if (photos.length <= 1) return null

  // Only show first 4 thumbnails to match mockup
  const displayedPhotos = photos.slice(0, 4)

  return (
    <div className={cn("mt-3", className)}>
      <div className="flex gap-1.5 sm:gap-2">
        {displayedPhotos.map((photo, index) => {
          const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
          if (!photoUrl) return null

          const isActive = index === currentIndex

          return (
            <button
              key={photo.id}
              onClick={() => onThumbnailClick(index)}
              className={cn(
                "relative flex-1 min-w-[60px] aspect-square rounded-lg overflow-hidden transition-all duration-200",
                isActive
                  ? "ring-2 ring-teal-500"
                  : "hover:opacity-90"
              )}
              aria-label={`View photo ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
            >
              <Image
                src={photoUrl}
                alt={photo.caption || `Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 150px"
              />
              {isActive && (
                <div className="absolute inset-0 border-2 border-teal-500 rounded-lg pointer-events-none" />
              )}
            </button>
          )
        })}
        {photos.length > 4 && (
          <div className="flex-1 min-w-[60px] aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <span className="text-xs sm:text-sm font-medium">+{photos.length - 4} more</span>
          </div>
        )}
      </div>
    </div>
  )
}
