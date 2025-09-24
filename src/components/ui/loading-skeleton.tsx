'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Base skeleton component with improved animations
 */
function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200/70 dark:bg-gray-800/70',
        'relative overflow-hidden',
        'before:absolute before:inset-0',
        'before:translate-x-[-100%] before:bg-gradient-to-r',
        'before:from-transparent before:via-white/20 before:to-transparent',
        'before:animate-shimmer',
        'dark:before:via-white/10',
        className
      )}
      {...props}
    />
  )
}

/**
 * Text skeleton with different sizes
 */
interface TextSkeletonProps {
  lines?: number
  className?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
}

function TextSkeleton({
  lines = 1,
  className = '',
  size = 'base'
}: TextSkeletonProps) {
  const heights = {
    xs: 'h-3',
    sm: 'h-4',
    base: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
    '2xl': 'h-7',
    '3xl': 'h-8'
  }

  if (lines === 1) {
    return <Skeleton className={cn(heights[size], 'w-3/4', className)} />
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            heights[size],
            index === lines - 1 ? 'w-1/2' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Card skeleton for dashboard stats and album cards
 */
interface CardSkeletonProps {
  className?: string
  showHeader?: boolean
  showFooter?: boolean
  variant?: 'stats' | 'album' | 'profile' | 'default'
}

function CardSkeleton({
  className = '',
  showHeader = true,
  showFooter = false,
  variant = 'default'
}: CardSkeletonProps) {
  if (variant === 'stats') {
    return (
      <div className={cn('p-6 border rounded-lg bg-white/70 backdrop-blur-sm', className)}>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    )
  }

  if (variant === 'album') {
    return (
      <div className={cn('p-4 border rounded-lg bg-white', className)}>
        <div className="flex gap-4">
          <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className={cn('p-6 border rounded-lg bg-white', className)}>
        <div className="flex items-start gap-4">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <TextSkeleton lines={2} size="sm" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-6 border rounded-lg bg-white', className)}>
      {showHeader && (
        <div className="mb-4">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      <div className="space-y-3">
        <TextSkeleton lines={3} />
      </div>

      {showFooter && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * List skeleton for repeated items
 */
interface ListSkeletonProps {
  items?: number
  className?: string
  itemClassName?: string
  variant?: 'simple' | 'detailed' | 'compact'
}

function ListSkeleton({
  items = 3,
  className = '',
  itemClassName = '',
  variant = 'simple'
}: ListSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className={cn('flex items-center gap-3', itemClassName)}>
            <Skeleton className="w-8 h-8 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-12 h-6 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className={cn('flex gap-4 p-4 border rounded-lg', itemClassName)}>
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <TextSkeleton lines={2} size="sm" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className={cn('flex items-center gap-3', itemClassName)}>
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Grid skeleton for photo grids or card grids
 */
interface GridSkeletonProps {
  items?: number
  columns?: number
  className?: string
  itemClassName?: string
  aspectRatio?: 'square' | 'photo' | 'landscape' | 'portrait'
}

function GridSkeleton({
  items = 6,
  columns = 3,
  className = '',
  itemClassName = '',
  aspectRatio = 'square'
}: GridSkeletonProps) {
  const aspectClasses = {
    square: 'aspect-square',
    photo: 'aspect-photo',
    landscape: 'aspect-landscape',
    portrait: 'aspect-portrait'
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`,
        className
      )}
    >
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className={cn('space-y-2', itemClassName)}>
          <Skeleton className={cn('w-full rounded-lg', aspectClasses[aspectRatio])} />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/**
 * Page skeleton for full page loading states
 */
interface PageSkeletonProps {
  variant?: 'dashboard' | 'profile' | 'albums' | 'settings'
  className?: string
}

function PageSkeleton({ variant = 'dashboard', className = '' }: PageSkeletonProps) {
  if (variant === 'dashboard') {
    return (
      <div className={cn('space-y-8', className)}>
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} variant="stats" />
          ))}
        </div>

        {/* Recent albums */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <ListSkeleton items={3} variant="detailed" />
        </div>
      </div>
    )
  }

  if (variant === 'albums') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* Albums grid */}
        <GridSkeleton items={9} columns={3} aspectRatio="photo" />
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className={cn('space-y-6', className)}>
        <CardSkeleton variant="profile" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton variant="stats" />
          <CardSkeleton variant="stats" />
          <CardSkeleton variant="stats" />
        </div>
        <GridSkeleton items={6} columns={2} aspectRatio="photo" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <CardSkeleton showHeader showFooter />
      <ListSkeleton items={5} variant="detailed" />
    </div>
  )
}

// Export all components
export {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  ListSkeleton,
  GridSkeleton,
  PageSkeleton
}

// Export as default for backward compatibility
export default Skeleton