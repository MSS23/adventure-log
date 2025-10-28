'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, MapPin, Calendar, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Skeleton } from '@/components/ui/skeleton'

interface AlbumPreviewProps {
  album: {
    id: string
    title: string
    cover_photo_url?: string | null
    cover_image_url?: string | null
    cover_photo_x_offset?: number
    cover_photo_y_offset?: number
    location_name?: string | null
    location?: string | null
    date_start?: string | null
    start_date?: string | null
    likes_count?: number
    photos_count?: number
  }
  aspectRatio?: 'square' | 'portrait' | 'landscape' | '4:3' | '16:9'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showMetadata?: boolean
  showOverlay?: boolean
  href?: string
  onClick?: () => void
  className?: string
  priority?: boolean
}

const aspectRatioClasses = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video'
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

export function AlbumPreview({
  album,
  aspectRatio = 'square',
  size = 'md',
  showMetadata = true,
  showOverlay = true,
  href,
  onClick,
  className,
  priority = false
}: AlbumPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Get the cover photo URL (handle multiple field names)
  const coverPhotoPath = album.cover_photo_url || album.cover_image_url
  const coverPhotoUrl = coverPhotoPath ? getPhotoUrl(coverPhotoPath) : null

  // Get location (handle multiple field names)
  const location = album.location_name || album.location

  // Get date (handle multiple field names)
  const date = album.date_start || album.start_date

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-gray-100 transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02]',
        aspectRatioClasses[aspectRatio],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <Skeleton className="absolute inset-0 z-10" />
      )}

      {/* Image or placeholder */}
      {coverPhotoUrl && !hasError ? (
        <Image
          src={coverPhotoUrl}
          alt={album.title}
          fill
          className={cn(
            'object-cover transition-transform duration-500 group-hover:scale-105',
            isLoading && 'opacity-0',
            !isLoading && 'animate-in fade-in-50 duration-300'
          )}
          style={{
            objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
          }}
          sizes={
            size === 'xs' ? '100px' :
            size === 'sm' ? '200px' :
            size === 'md' ? '300px' :
            size === 'lg' ? '400px' :
            '500px'
          }
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          priority={priority}
          quality={85}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <Camera className={cn(
            'text-gray-300',
            size === 'xs' && 'h-6 w-6',
            size === 'sm' && 'h-8 w-8',
            size === 'md' && 'h-10 w-10',
            size === 'lg' && 'h-12 w-12',
            size === 'xl' && 'h-14 w-14'
          )} />
        </div>
      )}

      {/* Overlay with metadata */}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className={cn(
            'absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white',
            sizeClasses[size]
          )}>
            <h3 className="font-semibold truncate mb-1">{album.title}</h3>

            {showMetadata && (
              <div className="space-y-1">
                {location && (
                  <p className="flex items-center gap-1 text-white/90 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">{location}</span>
                  </p>
                )}

                <div className="flex items-center gap-3 text-white/80">
                  {date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{formatDate(date)}</span>
                    </span>
                  )}

                  {album.likes_count !== undefined && album.likes_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span className="text-xs">{album.likes_count}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permanent bottom gradient for better text visibility */}
      {!showOverlay && showMetadata && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent">
          <div className={cn(
            'p-2 sm:p-3 text-white',
            sizeClasses[size]
          )}>
            <h3 className="font-medium truncate">{album.title}</h3>
            {location && (
              <p className="text-xs text-white/90 truncate mt-1">{location}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // Wrap with Link if href is provided
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// Lazy loading version for lists
export function LazyAlbumPreview(props: AlbumPreviewProps) {
  const [isInView, setIsInView] = useState(false)

  return (
    <div
      ref={(node) => {
        if (!node) return
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsInView(true)
              observer.disconnect()
            }
          },
          { threshold: 0.1, rootMargin: '100px' }
        )
        observer.observe(node)
      }}
      className={cn(aspectRatioClasses[props.aspectRatio || 'square'], props.className)}
    >
      {isInView ? (
        <AlbumPreview {...props} />
      ) : (
        <Skeleton className="w-full h-full rounded-lg" />
      )}
    </div>
  )
}