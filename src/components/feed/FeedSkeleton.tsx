'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * FeedSkeleton - Shimmer loading skeletons for the feed page
 *
 * Provides smooth, animated loading states that match the feed card layout
 */

interface FeedSkeletonProps {
  count?: number
  className?: string
}

// Shimmer animation keyframes
const shimmerVariants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear' as const,
    },
  },
}

// Base shimmer component for reuse
function ShimmerOverlay() {
  return (
    <motion.div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
    />
  )
}

// Individual feed card skeleton
function FeedCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header - User info */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar skeleton */}
        <div className="relative overflow-hidden rounded-full w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-100">
          <ShimmerOverlay />
        </div>
        {/* Username and location */}
        <div className="flex-1 space-y-2">
          <div className="relative overflow-hidden h-4 w-28 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md">
            <ShimmerOverlay />
          </div>
          <div className="relative overflow-hidden h-3 w-20 bg-gradient-to-r from-gray-100 to-gray-50 rounded-md">
            <ShimmerOverlay />
          </div>
        </div>
        {/* Menu dots */}
        <div className="relative overflow-hidden h-6 w-6 bg-gray-100 rounded-full">
          <ShimmerOverlay />
        </div>
      </div>

      {/* Image skeleton - 4:5 aspect ratio */}
      <div className="relative overflow-hidden aspect-[4/5] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
        <ShimmerOverlay />
        {/* Simulated photo indicator dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full bg-white/50',
                i === 0 ? 'w-3 h-1.5' : 'w-1.5 h-1.5'
              )}
            />
          ))}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Like, Comment, Share buttons */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden h-7 w-7 bg-gray-100 rounded-lg"
            >
              <ShimmerOverlay />
            </div>
          ))}
        </div>
        {/* Bookmark button */}
        <div className="relative overflow-hidden h-7 w-7 bg-gray-100 rounded-lg">
          <ShimmerOverlay />
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 pb-4 space-y-3">
        {/* Like count */}
        <div className="relative overflow-hidden h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md">
          <ShimmerOverlay />
        </div>

        {/* Caption lines */}
        <div className="space-y-2">
          <div className="relative overflow-hidden h-4 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-md">
            <ShimmerOverlay />
          </div>
          <div className="relative overflow-hidden h-4 w-3/4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-md">
            <ShimmerOverlay />
          </div>
        </div>

        {/* Date/time */}
        <div className="relative overflow-hidden h-3 w-16 bg-gray-100 rounded-md mt-2">
          <ShimmerOverlay />
        </div>
      </div>
    </motion.div>
  )
}

// Compact card skeleton for smaller layouts
function CompactCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Square image */}
      <div className="relative overflow-hidden aspect-square bg-gradient-to-br from-gray-200 to-gray-100">
        <ShimmerOverlay />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="relative overflow-hidden h-4 w-full bg-gradient-to-r from-gray-200 to-gray-100 rounded-md">
          <ShimmerOverlay />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative overflow-hidden rounded-full w-5 h-5 bg-gray-200">
            <ShimmerOverlay />
          </div>
          <div className="relative overflow-hidden h-3 w-16 bg-gray-100 rounded-md">
            <ShimmerOverlay />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Story circle skeleton
function StorySkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex flex-col items-center gap-1.5 px-2"
    >
      {/* Story ring */}
      <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-gray-200 via-gray-100 to-gray-200">
        <div className="relative overflow-hidden w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-100">
          <ShimmerOverlay />
        </div>
      </div>
      {/* Username */}
      <div className="relative overflow-hidden h-3 w-14 bg-gray-100 rounded-md">
        <ShimmerOverlay />
      </div>
    </motion.div>
  )
}

// Stories row skeleton
export function StoriesRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden py-2 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <StorySkeleton key={i} index={i} />
      ))}
    </div>
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
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="relative overflow-hidden h-6 w-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md">
            <ShimmerOverlay />
          </div>
          <div className="relative overflow-hidden h-3 w-16 bg-gray-100 rounded-md">
            <ShimmerOverlay />
          </div>
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
      transition={{ delay: index * 0.08 }}
      className="flex gap-3 py-3"
    >
      {/* Avatar */}
      <div className="relative overflow-hidden rounded-full w-8 h-8 bg-gray-200 flex-shrink-0">
        <ShimmerOverlay />
      </div>
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="relative overflow-hidden h-3.5 w-20 bg-gray-200 rounded-md">
          <ShimmerOverlay />
        </div>
        <div className="relative overflow-hidden h-3 w-full bg-gray-100 rounded-md">
          <ShimmerOverlay />
        </div>
        <div className="relative overflow-hidden h-3 w-2/3 bg-gray-100 rounded-md">
          <ShimmerOverlay />
        </div>
      </div>
    </motion.div>
  )
}

// Comments list skeleton
export function CommentsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

// Full page loading skeleton
export function FullPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Stories row */}
      <StoriesRowSkeleton />

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Feed cards */}
      <FeedSkeleton count={2} />
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
        className={cn(
          'rounded-full border-2 border-gray-200 border-t-teal-500',
          sizes[size]
        )}
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
      <span className="text-sm text-gray-500">Loading more...</span>
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
          className="w-6 h-6 rounded-full border-2 border-teal-500"
          style={{
            borderTopColor: 'transparent',
            rotate: `${progress * 360}deg`,
          }}
        />
      )}
    </motion.div>
  )
}

export { FeedCardSkeleton, CompactCardSkeleton, StorySkeleton }
