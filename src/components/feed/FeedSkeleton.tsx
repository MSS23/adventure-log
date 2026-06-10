'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * FeedSkeleton - Loading skeletons for the feed page
 *
 * Provides smooth, animated loading states that match the feed card layout
 */

interface FeedSkeletonProps {
  count?: number
  className?: string
}

// Individual feed card skeleton
function FeedCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header - User info */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar skeleton */}
        <Skeleton className="h-10 w-10 rounded-full" />
        {/* Username and location */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Menu dots */}
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-none" />

      {/* Action buttons row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Like, Comment, Share buttons */}
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-full" />
          ))}
        </div>
        {/* Bookmark button */}
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>

      {/* Content area */}
      <div className="px-4 pb-4 space-y-3">
        {/* Like count */}
        <Skeleton className="h-4 w-24" />

        {/* Caption lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Date/time */}
        <Skeleton className="h-3 w-16" />
      </div>
    </motion.div>
  )
}

// Compact card skeleton for smaller layouts
function CompactCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Square image */}
      <Skeleton className="aspect-square w-full rounded-none" />

      {/* Content */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </motion.div>
  )
}

// Main feed skeleton with staggered cards
export function FeedSkeleton({ count = 3, className }: FeedSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <FeedCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

// Grid skeleton for explore/discover pages
export function GridSkeleton({
  count = 9,
  columns = 3,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  return (
    <div className={cn('grid gap-3', colClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CompactCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

// Profile stats skeleton
export function ProfileStatsSkeleton() {
  return (
    <div className="flex items-center justify-around py-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex flex-col items-center gap-1"
        >
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-3 w-16" />
        </motion.div>
      ))}
    </div>
  )
}

// Comment skeleton
export function CommentSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex gap-3 py-3"
    >
      {/* Avatar */}
      <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </motion.div>
  )
}

// Comments list skeleton
export function CommentsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

// Loading spinner with pulse
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }

  return (
    <motion.div
      className={cn('flex items-center justify-center', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={cn('rounded-full border-2 border-muted border-t-primary', sizes[size])}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  )
}

// "Loading more" indicator for infinite scroll
export function LoadingMore({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center justify-center gap-2 py-6', className)}
    >
      <LoadingSpinner size="sm" />
      <span className="text-sm text-muted-foreground">Loading more...</span>
    </motion.div>
  )
}

// Pull to refresh indicator
export function PullToRefreshIndicator({
  progress,
  isRefreshing,
}: {
  progress: number // 0 to 1
  isRefreshing: boolean
}) {
  return (
    <motion.div
      className="flex items-center justify-center py-4"
      initial={false}
      animate={{
        opacity: progress > 0.1 ? 1 : 0,
        scale: Math.min(progress, 1),
      }}
    >
      {isRefreshing ? (
        <LoadingSpinner size="md" />
      ) : (
        <motion.div
          className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
          style={{
            rotate: `${progress * 360}deg`,
          }}
        />
      )}
    </motion.div>
  )
}

export { FeedCardSkeleton, CompactCardSkeleton }
