/**
 * Lazy Loading Wrapper Component
 * Provides intersection observer-based lazy loading for any component
 */

import React from 'react'
import Image from 'next/image'
import { useLazyComponent, useLazyImage } from '@/lib/hooks/useIntersectionObserver'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  rootMargin?: string
  threshold?: number
  delay?: number
  minHeight?: string | number
}

/**
 * Wrapper component that lazy loads children when they enter viewport
 */
export function LazyWrapper({
  children,
  fallback = null,
  className = '',
  rootMargin = '100px',
  threshold = 0.1,
  delay = 0,
  minHeight
}: LazyWrapperProps) {
  const { ref, shouldRender } = useLazyComponent<HTMLDivElement>({
    rootMargin,
    threshold,
    delay
  })

  const style = minHeight ? { minHeight } : undefined

  return (
    <div ref={ref} className={className} style={style}>
      {shouldRender ? children : fallback}
    </div>
  )
}

/**
 * Skeleton loading component for lazy content
 */
export function LazyLoadingSkeleton({
  className = '',
  height = '200px',
  variant = 'rectangular'
}: {
  className?: string
  height?: string | number
  variant?: 'rectangular' | 'circular' | 'text'
}) {
  const baseClasses = 'animate-pulse bg-muted'

  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4'
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ height }}
      aria-label="Loading..."
    />
  )
}

/**
 * Optimized image component with lazy loading
 */
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  width,
  height,
  sizes,
  priority = false
}: LazyImageProps) {
  const { ref, shouldLoad, imageLoaded, imageError } = useLazyImage<HTMLDivElement>(src, {
    skip: priority // Skip lazy loading for priority images
  })

  if (priority) {
    // For priority images, load immediately without lazy loading
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        width={width || 0}
        height={height || 0}
        sizes={sizes}
        priority
      />
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {shouldLoad && !imageError && (
        <Image
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          width={width || 0}
          height={height || 0}
          sizes={sizes}
          loading="lazy"
          onLoad={() => {/* Image loaded handled by hook */}}
          onError={() => {/* Image error handled by hook */}}
        />
      )}

      {/* Placeholder while loading */}
      {(!shouldLoad || (!imageLoaded && !imageError)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {placeholder ? (
            <Image
              src={placeholder}
              alt={alt}
              className="blur-sm scale-110 transition-all duration-300"
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <LazyLoadingSkeleton
              height="100%"
              className="w-full"
            />
          )}
        </div>
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LazyWrapper