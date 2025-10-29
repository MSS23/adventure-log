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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Scroll to active thumbnail when current index changes
  useEffect(() => {
    const activeThumbnail = thumbnailRefs.current[currentIndex]
    if (activeThumbnail && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const thumbnail = activeThumbnail

      const containerRect = container.getBoundingClientRect()
      const thumbnailRect = thumbnail.getBoundingClientRect()

      // Calculate if thumbnail is outside visible area
      const isOutOfView =
        thumbnailRect.left < containerRect.left ||
        thumbnailRect.right > containerRect.right

      if (isOutOfView) {
        // Scroll to center the thumbnail
        const scrollLeft =
          thumbnail.offsetLeft -
          container.offsetWidth / 2 +
          thumbnail.offsetWidth / 2

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }, [currentIndex])

  if (photos.length <= 1) return null

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {photos.map((photo, index) => {
          const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
          if (!photoUrl) return null

          const isActive = index === currentIndex

          return (
            <button
              key={photo.id}
              ref={(el) => {
                thumbnailRefs.current[index] = el
              }}
              onClick={() => onThumbnailClick(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-200",
                "hover:scale-105 hover:shadow-lg",
                isActive
                  ? "ring-4 ring-teal-500 ring-offset-2 scale-105 shadow-lg"
                  : "ring-2 ring-gray-200 opacity-70 hover:opacity-100"
              )}
              aria-label={`View photo ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
            >
              <Image
                src={photoUrl}
                alt={photo.caption || `Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              {isActive && (
                <div className="absolute inset-0 bg-teal-500/20" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
