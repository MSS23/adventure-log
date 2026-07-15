'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Skeleton } from '@/components/ui/skeleton'

interface OptimizedAvatarProps {
  src?: string | null
  alt?: string
  fallback: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  priority?: boolean
}

const sizeMap = {
  xs: { className: 'h-6 w-6', size: 24 },
  sm: { className: 'h-8 w-8', size: 32 },
  md: { className: 'h-10 w-10', size: 40 },
  lg: { className: 'h-12 w-12', size: 48 },
  xl: { className: 'h-14 w-14', size: 56 }
}

export function OptimizedAvatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  priority = false
}: OptimizedAvatarProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const sizeConfig = sizeMap[size]
  const avatarUrl = src ? getPhotoUrl(src, 'avatars') : null

  // Consistent emerald/slate brand tint based on the fallback text — calm, on-palette
  const getGradientClass = (text: string) => {
    // Static brand hexes (not theme vars) so white initials stay legible in both themes
    const gradients = [
      'from-[#059669] to-[#34D399]',
      'from-[#0D9488] to-[#2DD4BF]',
      'from-[#1E293B] to-[#475569]',
      'from-[#047857] to-[#10B981]',
    ]
    const index = text.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  if (!avatarUrl || hasError) {
    return (
      <Avatar className={cn(sizeConfig.className, 'ring-1 ring-border', className)}>
        <AvatarFallback
          className={cn(
            'bg-gradient-to-br text-white font-bold',
            getGradientClass(fallback),
            size === 'xs' && 'text-[10px]',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            size === 'xl' && 'text-lg'
          )}
        >
          {fallback}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={cn(sizeConfig.className, 'ring-1 ring-border relative overflow-hidden', className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <div className="relative w-full h-full">
        {/* Avatars render at 56px or less. A native image avoids routing tiny
            OAuth and generated-avatar assets through the full photo optimizer,
            while preserving lazy/eager loading semantics. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={alt}
          width={sizeConfig.size}
          height={sizeConfig.size}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'h-full w-full object-cover',
            isLoading && 'opacity-0',
            !isLoading && 'animate-in fade-in-50 duration-300'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
        />
      </div>
    </Avatar>
  )
}

// Wrapper component for lazy loading avatars in lists
export function LazyAvatar(props: OptimizedAvatarProps) {
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
          { threshold: 0.1, rootMargin: '50px' }
        )
        observer.observe(node)
      }}
    >
      {isInView ? (
        <OptimizedAvatar {...props} />
      ) : (
        <Avatar className={cn(sizeMap[props.size || 'md'].className, 'ring-1 ring-border', props.className)}>
          <Skeleton className="w-full h-full" />
        </Avatar>
      )}
    </div>
  )
}
