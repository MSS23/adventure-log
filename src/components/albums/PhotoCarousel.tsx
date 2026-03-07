'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Photo } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCarouselProps {
  photos: Photo[]
  currentIndex: number
  onPhotoChange: (index: number) => void
  className?: string
}

export function PhotoCarousel({
  photos,
  currentIndex,
  onPhotoChange,
  className
}: PhotoCarouselProps) {
  const [imageLoading, setImageLoading] = useState(true)

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < photos.length - 1

  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      onPhotoChange(currentIndex - 1)
      setImageLoading(true)
    }
  }, [canGoPrevious, currentIndex, onPhotoChange])

  const handleNext = useCallback(() => {
    if (canGoNext) {
      onPhotoChange(currentIndex + 1)
      setImageLoading(true)
    }
  }, [canGoNext, currentIndex, onPhotoChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevious, handleNext])

  const currentPhoto = photos[currentIndex]
  if (!currentPhoto) return null

  const photoUrl = getPhotoUrl(currentPhoto.file_path || currentPhoto.storage_path)
  if (!photoUrl) return null

  return (
    <div className={cn("relative w-full rounded-lg overflow-hidden bg-gray-100", className)}>
      {/* Main Photo Display */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[4/3]">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
          </div>
        )}
        <Image
          src={photoUrl}
          alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 60vw"
          priority={currentIndex === 0}
          onLoad={() => setImageLoading(false)}
        />

        {/* Pagination dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onPhotoChange(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === currentIndex
                    ? "bg-white w-8"
                    : "bg-white/60 hover:bg-white/80"
                )}
                aria-label={`Go to photo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            className={cn(
              "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 md:w-10 md:h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all",
              !canGoPrevious && "opacity-50 cursor-not-allowed"
            )}
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          {/* Next Button */}
          <button
            className={cn(
              "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 md:w-10 md:h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all",
              !canGoNext && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5 text-gray-700" />
          </button>
        </>
      )}
    </div>
  )
}
