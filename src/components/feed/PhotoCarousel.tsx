'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { useDoubleTapTouch } from '@/lib/hooks/useDoubleTap'
import { HeartAnimation } from '@/components/animations/HeartAnimation'
import { useLikes } from '@/lib/hooks/useSocial'
import { useAuth } from '@/components/auth/AuthProvider'

interface Photo {
  id: string
  file_path: string
  caption?: string
  taken_at?: string
}

interface PhotoCarouselProps {
  photos: Photo[]
  albumTitle: string
  albumId?: string
  coverPhotoOffset?: { x?: number; y?: number }
  className?: string
  onDoubleTap?: () => void
}

export function PhotoCarousel({
  photos,
  albumTitle,
  albumId,
  coverPhotoOffset,
  className,
  onDoubleTap
}: PhotoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const { user } = useAuth()

  // Use the same like hook as LikeButton for state sync
  const { toggleLike } = useLikes(albumId, undefined)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  // Handle double-tap to toggle like/unlike - uses same hook as LikeButton for sync
  const handleDoubleTapLike = useCallback(() => {
    if (!albumId || !user?.id) return

    // Show animation immediately for better UX
    setShowHeartAnimation(true)

    // Use the same toggleLike function as LikeButton for perfect sync
    toggleLike()

    // Call parent handler if provided
    onDoubleTap?.()
  }, [albumId, user?.id, toggleLike, onDoubleTap])

  const { handleTouchStart, handleTouchEnd, cleanup } = useDoubleTapTouch({
    onDoubleTap: handleDoubleTapLike,
    enabled: !!albumId && !!user?.id,
    delay: 300
  })

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
      cleanup()
    }
  }, [emblaApi, onSelect, cleanup])

  if (!photos || photos.length === 0) {
    return (
      <div className={cn("relative aspect-[4/5] min-h-0 bg-gradient-to-br from-gray-900 to-gray-800", className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <Camera className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mb-2 sm:mb-3" />
          <p className="text-xs sm:text-sm text-gray-400 font-medium">No photos</p>
        </div>
      </div>
    )
  }

  // If only one photo, show it without carousel controls
  if (photos.length === 1) {
    const photo = photos[0]
    const photoUrl = getPhotoUrl(photo.file_path)

    return (
      <div
        className={cn("relative aspect-[4/5] min-h-0 bg-gradient-to-br from-gray-900 to-gray-800", className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTapLike}
      >
        {photoUrl ? (
          <>
            <Image
              src={photoUrl}
              alt={photo.caption || albumTitle}
              fill
              className="object-cover select-none"
              style={{
                objectPosition: `${coverPhotoOffset?.x ?? 50}% ${coverPhotoOffset?.y ?? 50}%`
              }}
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 650px"
              loading="lazy"
              quality={90}
            />
            <HeartAnimation
              show={showHeartAnimation}
              onComplete={() => setShowHeartAnimation(false)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <Camera className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mb-2 sm:mb-3" />
            <p className="text-xs sm:text-sm text-gray-400 font-medium">No image</p>
          </div>
        )}
      </div>
    )
  }

  // Multiple photos - show carousel
  return (
    <div className={cn("relative group", className)}>
      <div
        className="overflow-hidden"
        ref={emblaRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTapLike}
      >
        <div className="flex">
          {photos.map((photo, index) => {
            const photoUrl = getPhotoUrl(photo.file_path)

            return (
              <div
                key={photo.id}
                className="flex-[0_0_100%] min-w-0 relative aspect-[4/5] bg-gradient-to-br from-gray-900 to-gray-800"
              >
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={photo.caption || `${albumTitle} - Photo ${index + 1}`}
                    fill
                    className="object-cover select-none"
                    style={{
                      objectPosition: index === 0 && coverPhotoOffset
                        ? `${coverPhotoOffset.x ?? 50}% ${coverPhotoOffset.y ?? 50}%`
                        : 'center'
                    }}
                    sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 650px"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    quality={90}
                    priority={index === 0}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                    <Camera className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-400 font-medium">No image</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Heart animation overlay */}
      <HeartAnimation
        show={showHeartAnimation}
        onComplete={() => setShowHeartAnimation(false)}
      />

      {/* Previous button */}
      {canScrollPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            scrollPrev()
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-8 md:h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Next button */}
      {canScrollNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            scrollNext()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-8 md:h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Next photo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Dot indicators - Smaller and positioned at bottom */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">
          {photos.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-1 h-1 rounded-full transition-all duration-200",
                selectedIndex === index
                  ? "bg-white w-3"
                  : "bg-white/60"
              )}
              aria-label={`Photo ${index + 1} of ${photos.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}