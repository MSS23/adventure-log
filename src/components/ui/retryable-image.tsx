'use client'

import { useState, useCallback } from 'react'
import Image, { type ImageProps } from 'next/image'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * next/image drop-in that recovers from a transient load failure.
 *
 * During Supabase slow spells the /_next/image optimizer's upstream fetch can
 * time out; a plain <Image> then stays permanently broken (empty gray box)
 * until a full navigation, because next/image never retries a failed src. This
 * wrapper retries a capped number of times with a cache-busting query param,
 * and only after exhausting them shows a small "image unavailable" placeholder
 * instead of a blank tile.
 *
 * It also treats a *degenerate* image — one that loads HTTP 200 but is a 1×1
 * placeholder pixel — as broken. Such images "succeed" (no error event) yet
 * render as a stretched blank/solid tile, which reads as "image not loading."
 * Showing the placeholder instead is clearer than a smeared pixel.
 */
interface RetryableImageProps extends Omit<ImageProps, 'onError' | 'src'> {
  src: string
  /** Max automatic retries before showing the fallback. Default 2. */
  maxRetries?: number
}

export function RetryableImage({
  src,
  maxRetries = 2,
  className,
  alt,
  ...props
}: RetryableImageProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [failed, setFailed] = useState(false)

  const handleError = useCallback(() => {
    setRetryCount((c) => {
      if (c >= maxRetries) {
        setFailed(true)
        return c
      }
      return c + 1
    })
  }, [maxRetries])

  // A real cover is never 1×1. Supabase/seed placeholders and some broken
  // uploads land as a 1×1 JPEG that loads fine but looks empty — surface the
  // fallback rather than a stretched pixel.
  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
        setFailed(true)
      }
    },
    [],
  )

  if (failed) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        role="img"
        aria-label={typeof alt === 'string' ? alt : 'Image unavailable'}
      >
        <ImageOff className="h-8 w-8 opacity-50" />
      </div>
    )
  }

  // Cache-bust each retry so the optimizer re-fetches instead of serving the
  // failed entry. retryCount is 0 on the first (clean) attempt → no param.
  const retrySrc = retryCount > 0 ? `${src}${src.includes('?') ? '&' : '?'}_r=${retryCount}` : src

  return (
    <Image
      {...props}
      key={retryCount}
      src={retrySrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}
