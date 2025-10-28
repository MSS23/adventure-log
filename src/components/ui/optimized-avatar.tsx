'use client'

import { useState } from 'react'
import Image from 'next/image'
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

  // Generate a consistent gradient based on the fallback text
  const getGradientClass = (text: string) => {
    const gradients = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-teal-500 to-green-500',
      'from-amber-500 to-orange-500'
    ]
    const index = text.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  if (!avatarUrl || hasError) {
    return (
      <Avatar className={cn(sizeConfig.className, 'ring-1 ring-gray-200', className)}>
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
    <Avatar className={cn(sizeConfig.className, 'ring-1 ring-gray-200 relative overflow-hidden', className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <div className="relative w-full h-full">
        <Image
          src={avatarUrl}
          alt={alt}
          fill
          sizes={`${sizeConfig.size}px`}
          className={cn(
            'object-cover',
            isLoading && 'opacity-0',
            !isLoading && 'animate-in fade-in-50 duration-300'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          priority={priority}
          quality={85}
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
        <Avatar className={cn(sizeMap[props.size || 'md'].className, 'ring-1 ring-gray-200', props.className)}>
          <Skeleton className="w-full h-full" />
        </Avatar>
      )}
    </div>
  )
}