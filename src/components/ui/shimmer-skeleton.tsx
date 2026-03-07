'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Shimmer animation CSS
const shimmerClass = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:translate-x-[-100%]
  before:animate-[shimmer_2s_infinite]
  before:bg-gradient-to-r
  before:from-transparent before:via-white/60 before:to-transparent
`

// Base shimmer skeleton
export function Shimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded-md',
        shimmerClass,
        className
      )}
      {...props}
    />
  )
}

// Staggered container for skeleton groups
interface StaggeredSkeletonProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggeredSkeleton({
  children,
  className,
  staggerDelay = 0.1,
}: StaggeredSkeletonProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Individual staggered item
export function SkeletonItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  )
}

// Enhanced Album Grid Skeleton
export function AlbumGridShimmer({ count = 6 }: { count?: number }) {
  return (
    <StaggeredSkeleton className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} className="space-y-3">
          <Shimmer className="aspect-[4/3] rounded-xl" />
          <div className="space-y-2">
            <Shimmer className="h-5 w-3/4 rounded-md" />
            <Shimmer className="h-4 w-1/2 rounded-md" />
          </div>
        </SkeletonItem>
      ))}
    </StaggeredSkeleton>
  )
}

// Enhanced Feed Skeleton
export function FeedShimmer({ count = 3 }: { count?: number }) {
  return (
    <StaggeredSkeleton className="space-y-6" staggerDelay={0.15}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem
          key={i}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-32 rounded-md" />
              <Shimmer className="h-3 w-24 rounded-md" />
            </div>
            <Shimmer className="h-8 w-8 rounded-full" />
          </div>

          {/* Image */}
          <Shimmer className="aspect-square w-full" />

          {/* Actions */}
          <div className="p-4 space-y-3">
            <div className="flex gap-4">
              <Shimmer className="h-8 w-20 rounded-lg" />
              <Shimmer className="h-8 w-20 rounded-lg" />
              <Shimmer className="h-8 w-20 rounded-lg" />
            </div>
            <Shimmer className="h-4 w-24 rounded-md" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-full rounded-md" />
              <Shimmer className="h-3 w-2/3 rounded-md" />
            </div>
          </div>
        </SkeletonItem>
      ))}
    </StaggeredSkeleton>
  )
}

// Enhanced Profile Header Skeleton
export function ProfileHeaderShimmer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex flex-col md:flex-row items-start gap-6">
        <Shimmer className="h-24 w-24 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-4 w-full">
          <div className="space-y-2">
            <Shimmer className="h-7 w-48 rounded-md" />
            <Shimmer className="h-5 w-32 rounded-md" />
          </div>
          <Shimmer className="h-4 w-full max-w-md rounded-md" />
          <div className="flex flex-wrap gap-6">
            <Shimmer className="h-12 w-20 rounded-lg" />
            <Shimmer className="h-12 w-24 rounded-lg" />
            <Shimmer className="h-12 w-20 rounded-lg" />
          </div>
        </div>
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>
    </motion.div>
  )
}

// Enhanced Dashboard Stats Skeleton
export function DashboardStatsShimmer() {
  return (
    <StaggeredSkeleton className="grid grid-cols-2 md:grid-cols-4 gap-4" staggerDelay={0.08}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonItem
          key={i}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex flex-col items-center space-y-3">
            <Shimmer className="h-10 w-10 rounded-lg" />
            <Shimmer className="h-8 w-16 rounded-md" />
            <Shimmer className="h-4 w-20 rounded-md" />
          </div>
        </SkeletonItem>
      ))}
    </StaggeredSkeleton>
  )
}

// Enhanced Globe Loading Skeleton
export function GlobeShimmer() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-[600px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl flex items-center justify-center overflow-hidden"
    >
      {/* Animated globe placeholder */}
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="h-48 w-48 rounded-full bg-gradient-to-br from-teal-400/30 via-cyan-500/20 to-blue-600/30 blur-sm" />
        <div className="absolute inset-4 rounded-full border-2 border-teal-500/30" />
        <div className="absolute inset-8 rounded-full border border-cyan-500/20" />
      </motion.div>

      {/* Pulsing loading text */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p className="text-white/70 text-sm">Loading your adventures...</p>
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 flex gap-2">
        <Shimmer className="h-3 w-16 rounded-full bg-white/10" />
        <Shimmer className="h-3 w-12 rounded-full bg-white/10" />
      </div>
    </motion.div>
  )
}

// Enhanced Search Results Skeleton
export function SearchResultsShimmer({ count = 6 }: { count?: number }) {
  return (
    <StaggeredSkeleton className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem
          key={i}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <Shimmer className="aspect-[4/3]" />
          <div className="p-4 space-y-3">
            <Shimmer className="h-5 w-3/4 rounded-md" />
            <Shimmer className="h-4 w-full rounded-md" />
            <Shimmer className="h-4 w-2/3 rounded-md" />
            <div className="flex items-center gap-2 pt-2">
              <Shimmer className="h-6 w-6 rounded-full" />
              <Shimmer className="h-3 w-24 rounded-md" />
            </div>
          </div>
        </SkeletonItem>
      ))}
    </StaggeredSkeleton>
  )
}

// Card skeleton with pulse glow
export function CardShimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Shimmer className="aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-5 w-3/4 rounded-md" />
        <Shimmer className="h-4 w-1/2 rounded-md" />
      </div>
    </motion.div>
  )
}

// Text line skeleton
export function TextShimmer({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn('h-4 rounded-md', {
            'w-full': i < lines - 1,
            'w-2/3': i === lines - 1,
          })}
        />
      ))}
    </div>
  )
}

// Avatar skeleton
export function AvatarShimmer({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }

  return <Shimmer className={cn(sizeClasses[size], 'rounded-full')} />
}

// Button skeleton
export function ButtonShimmer({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  }

  return <Shimmer className={cn(sizeClasses[size], 'rounded-lg')} />
}
