'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Photo } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [isHovering, setIsHovering] = useState(false)
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
    <div
      className={cn("relative w-full bg-white rounded-2xl overflow-hidden shadow-lg", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Main Photo Display */}
      <div className="relative w-full aspect-[4/3]">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        )}
        <Image
          src={photoUrl}
          alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 65vw"
          priority={currentIndex === 0}
          onLoad={() => setImageLoading(false)}
        />
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          {/* Previous Button */}
          <div
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-opacity duration-200",
              isHovering && canGoPrevious ? "opacity-100" : "opacity-0"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>

          {/* Next Button */}
          <div
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-200",
              isHovering && canGoNext ? "opacity-100" : "opacity-0"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </>
      )}

      {/* Photo Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
          <span className="text-white text-sm font-medium">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}

      {/* Caption */}
      {currentPhoto.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm leading-relaxed">{currentPhoto.caption}</p>
        </div>
      )}
    </div>
  )
}
