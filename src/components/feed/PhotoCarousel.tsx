'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
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
  priority?: boolean
  onDoubleTap?: () => void
}

export function PhotoCarousel({
  photos,
  albumTitle,
  albumId,
  coverPhotoOffset,
  className,
  priority = false,
  onDoubleTap
}: PhotoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  // Track which photos have finished decoding so they can fade up from the
  // muted backdrop instead of snapping in from nothing (perceived-lag polish).
  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({})
  const markLoaded = useCallback((id: string) => {
    setLoadedIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [])
  const { user } = useAuth()

  // Use the same like hook as LikeButton for state sync
  const { toggleLike } = useLikes(albumId, undefined, undefined, { fetchList: false, subscribe: false })

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
      <div className={cn("relative aspect-[4/3] min-h-0 bg-muted", className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Camera className="h-12 w-12 sm:h-14 sm:w-14 mb-2 sm:mb-3 text-primary/40" />
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">No photos</p>
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
        className={cn("relative aspect-[4/3] min-h-0 bg-muted", className)}
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
              className={cn(
                'object-cover select-none transition-opacity duration-500 ease-out',
                loadedIds[photo.id] ? 'opacity-100' : 'opacity-0',
              )}
              style={{
                objectPosition: `${coverPhotoOffset?.x ?? 50}% ${coverPhotoOffset?.y ?? 50}%`
              }}
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 650px"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              quality={75}
              onLoad={() => markLoaded(photo.id)}
            />
            <HeartAnimation
              show={showHeartAnimation}
              onComplete={() => setShowHeartAnimation(false)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="h-12 w-12 sm:h-14 sm:w-14 mb-2 sm:mb-3 text-primary/40" />
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">No image</p>
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
                className="flex-[0_0_100%] min-w-0 relative aspect-[4/3] bg-muted"
              >
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={photo.caption || `${albumTitle} - Photo ${index + 1}`}
                    fill
                    className={cn(
                      'object-cover select-none transition-opacity duration-500 ease-out',
                      loadedIds[photo.id] ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{
                      objectPosition: index === 0 && coverPhotoOffset
                        ? `${coverPhotoOffset.x ?? 50}% ${coverPhotoOffset.y ?? 50}%`
                        : 'center'
                    }}
                    sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 650px"
                    loading={index === 0 && priority ? 'eager' : 'lazy'}
                    quality={75}
                    priority={index === 0 && priority}
                    onLoad={() => markLoaded(photo.id)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="h-12 w-12 sm:h-14 sm:w-14 mb-2 sm:mb-3 text-primary/40" />
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">No image</p>
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
      <AnimatePresence>
        {canScrollPrev && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollPrev()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-8 md:h-8 rounded-full bg-black/65 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--color-olive-50)]"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next button */}
      <AnimatePresence>
        {canScrollNext && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollNext()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-8 md:h-8 rounded-full bg-black/65 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--color-olive-50)]"
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dot indicators - Smaller and positioned at bottom */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1 px-2 py-1 rounded-full bg-black/45 backdrop-blur-sm">
          {photos.map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full bg-[color:var(--color-olive-50)]"
              initial={false}
              animate={{
                width: selectedIndex === index ? 12 : 4,
                height: 4,
                opacity: selectedIndex === index ? 1 : 0.6
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={`Photo ${index + 1} of ${photos.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}