'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Camera, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { HeartAnimation } from '@/components/animations/HeartAnimation'
import { useLikes } from '@/lib/hooks/useSocial'
import { useAuth } from '@/components/auth/AuthProvider'
import { transitions, gestureConfig } from '@/lib/animations/spring-configs'

interface Photo {
  id: string
  file_path: string
  caption?: string
  taken_at?: string
}

interface EnhancedPhotoCarouselProps {
  photos: Photo[]
  albumTitle: string
  albumId?: string
  coverPhotoOffset?: { x?: number; y?: number }
  className?: string
  onDoubleTap?: () => void
  onPhotoChange?: (index: number) => void
  showZoomHint?: boolean
}

export function EnhancedPhotoCarousel({
  photos,
  albumTitle,
  albumId,
  coverPhotoOffset,
  className,
  onDoubleTap,
  onPhotoChange,
  showZoomHint = false,
}: EnhancedPhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const [direction, setDirection] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const { user } = useAuth()
  const { toggleLike } = useLikes(albumId, undefined)

  // For gesture-based swiping
  const dragX = useMotionValue(0)
  const dragProgress = useTransform(dragX, [-200, 0, 200], [-1, 0, 1])

  // Double tap detection
  const lastTap = useRef<number>(0)
  const tapTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleTap = useCallback(() => {
    const now = Date.now()
    const timeDiff = now - lastTap.current

    if (timeDiff < gestureConfig.doubleTapWindow && timeDiff > 0) {
      // Double tap detected
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current)
        tapTimeout.current = null
      }

      if (albumId && user?.id) {
        setShowHeartAnimation(true)
        toggleLike()
        onDoubleTap?.()
      }
    }

    lastTap.current = now
  }, [albumId, user?.id, toggleLike, onDoubleTap])

  const goToPhoto = useCallback((index: number) => {
    if (index === currentIndex) return
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
    onPhotoChange?.(index)
  }, [currentIndex, onPhotoChange])

  const nextPhoto = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      goToPhoto(currentIndex + 1)
    }
  }, [currentIndex, photos.length, goToPhoto])

  const prevPhoto = useCallback(() => {
    if (currentIndex > 0) {
      goToPhoto(currentIndex - 1)
    }
  }, [currentIndex, goToPhoto])

  // Handle drag end for swipe navigation
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50
      const velocity = info.velocity.x

      if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > gestureConfig.swipeVelocity) {
        if (info.offset.x > 0 || velocity > gestureConfig.swipeVelocity) {
          prevPhoto()
        } else {
          nextPhoto()
        }
      }
    },
    [nextPhoto, prevPhoto]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPhoto, prevPhoto])

  if (!photos || photos.length === 0) {
    return (
      <div className={cn('relative aspect-[4/5] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden', className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Camera className="h-16 w-16 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 font-medium">No photos</p>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]
  const photoUrl = getPhotoUrl(currentPhoto.file_path)

  // Slide variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: transitions.natural,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.95,
      transition: transitions.natural,
    }),
  }

  return (
    <div className={cn('relative group rounded-lg overflow-hidden', className)}>
      {/* Main photo area */}
      <div
        className="relative aspect-[4/5] bg-gray-900 overflow-hidden"
        onClick={handleTap}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={photos.length > 1 && !isZoomed ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ x: dragX }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={currentPhoto.caption || `${albumTitle} - Photo ${currentIndex + 1}`}
                fill
                className={cn(
                  'object-cover select-none transition-transform duration-300',
                  isZoomed && 'scale-150'
                )}
                style={{
                  objectPosition: currentIndex === 0 && coverPhotoOffset
                    ? `${coverPhotoOffset.x ?? 50}% ${coverPhotoOffset.y ?? 50}%`
                    : 'center'
                }}
                sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 650px"
                loading={currentIndex === 0 ? 'eager' : 'lazy'}
                quality={90}
                priority={currentIndex === 0}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Camera className="h-16 w-16 text-gray-300 mb-3" />
                <p className="text-sm text-gray-400 font-medium">No image</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Heart animation overlay */}
        <HeartAnimation
          show={showHeartAnimation}
          onComplete={() => setShowHeartAnimation(false)}
        />

        {/* Photo counter badge */}
        {photos.length > 1 && (
          <motion.div
            className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {currentIndex + 1} / {photos.length}
          </motion.div>
        )}

        {/* Zoom hint */}
        {showZoomHint && (
          <motion.div
            className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
          >
            <ZoomIn className="h-3 w-3" />
            Double-tap to like
          </motion.div>
        )}
      </div>

      {/* Navigation buttons */}
      <AnimatePresence>
        {currentIndex > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              prevPhoto()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg hover:bg-white text-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentIndex < photos.length - 1 && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              nextPhoto()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg hover:bg-white text-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 px-2.5 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
          {photos.map((_, index) => (
            <motion.button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                goToPhoto(index)
              }}
              className="rounded-full bg-white/80 hover:bg-white transition-colors"
              initial={false}
              animate={{
                width: currentIndex === index ? 16 : 6,
                height: 6,
                opacity: currentIndex === index ? 1 : 0.5,
              }}
              transition={transitions.snap}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Caption (if available) */}
      {currentPhoto.caption && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white text-sm line-clamp-2">{currentPhoto.caption}</p>
        </motion.div>
      )}
    </div>
  )
}
