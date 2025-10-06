'use client'

import { useState, useEffect, useRef, ComponentProps } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface OptimizedImageProps extends Omit<ComponentProps<typeof Image>, 'onLoad' | 'onError'> {
  /**
   * Enable lazy loading (default: true)
   */
  lazy?: boolean

  /**
   * Show loading skeleton (default: true)
   */
  showSkeleton?: boolean

  /**
   * Custom skeleton className
   */
  skeletonClassName?: string

  /**
   * Blur-up placeholder (default: false)
   */
  blurPlaceholder?: boolean

  /**
   * Callback when image loads successfully
   */
  onLoadComplete?: () => void

  /**
   * Callback when image fails to load
   */
  onLoadError?: (error: Error) => void

  /**
   * Fallback image URL
   */
  fallbackSrc?: string

  /**
   * Aspect ratio for skeleton (e.g., "16/9", "1/1", "4/3")
   */
  aspectRatio?: string
}

export function OptimizedImage({
  src,
  alt,
  className,
  lazy = true,
  showSkeleton = true,
  skeletonClassName,
  blurPlaceholder = false,
  onLoadComplete,
  onLoadError,
  fallbackSrc,
  aspectRatio,
  priority,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imgRef = useRef<HTMLImageElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(!lazy || priority)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before element enters viewport
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority])

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src)
    setIsLoading(true)
    setHasError(false)
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
    onLoadComplete?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)

    const error = new Error(`Failed to load image: ${src}`)
    onLoadError?.(error)

    // Try fallback image
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
    }
  }

  // Don't render image until it's in viewport (for lazy loading)
  const shouldRenderImage = isIntersecting || priority

  return (
    <div
      ref={imgRef as React.RefObject<HTMLDivElement>}
      className={cn('relative overflow-hidden', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Loading Skeleton */}
      {isLoading && showSkeleton && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center',
            skeletonClassName
          )}
        >
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center p-4">
            <svg
              className="h-12 w-12 mx-auto text-gray-400 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">Image not available</p>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {shouldRenderImage && currentSrc && (
        <Image
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            hasError && 'hidden'
          )}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          placeholder={blurPlaceholder ? 'blur' : undefined}
          {...props}
        />
      )}
    </div>
  )
}

/**
 * Hook for progressive image loading
 */
export function useProgressiveImage(
  lowQualitySrc: string,
  highQualitySrc: string
): string {
  const [src, setSrc] = useState(lowQualitySrc)

  useEffect(() => {
    const img = new window.Image()
    img.src = highQualitySrc
    img.onload = () => setSrc(highQualitySrc)
  }, [highQualitySrc])

  return src
}

/**
 * Photo grid with optimized lazy loading
 */
interface PhotoGridProps {
  photos: Array<{
    id: string
    url: string
    alt?: string
  }>
  columns?: number
  gap?: number
  onPhotoClick?: (photo: { id: string; url: string }) => void
  className?: string
}

export function OptimizedPhotoGrid({
  photos,
  columns = 3,
  gap = 4,
  onPhotoClick,
  className
}: PhotoGridProps) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`
      }}
    >
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square cursor-pointer group"
          onClick={() => onPhotoClick?.(photo)}
        >
          <OptimizedImage
            src={photo.url}
            alt={photo.alt || `Photo ${index + 1}`}
            fill
            className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
            lazy
            showSkeleton
            aspectRatio="1/1"
            sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw`}
          />
        </div>
      ))}
    </div>
  )
}
