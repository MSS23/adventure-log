'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circular' | 'rounded'
}

export function AnimatedSkeleton({ className, variant = 'default' }: SkeletonProps) {
  const borderRadius = variant === 'circular' ? '9999px' : variant === 'rounded' ? '12px' : '6px'

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-200",
        className
      )}
      style={{ borderRadius }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 0.5
        }}
      />
    </div>
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      <AnimatedSkeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <AnimatedSkeleton className="h-5 w-3/4" variant="rounded" />
        <AnimatedSkeleton className="h-4 w-1/2" variant="rounded" />
        <div className="flex items-center gap-3 pt-2">
          <AnimatedSkeleton className="h-8 w-8" variant="circular" />
          <AnimatedSkeleton className="h-4 w-24" variant="rounded" />
        </div>
      </div>
    </div>
  )
}

// Feed item skeleton
export function FeedItemSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "bg-white rounded-lg overflow-hidden border border-gray-200",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <AnimatedSkeleton className="h-10 w-10" variant="circular" />
        <div className="flex-1 space-y-2">
          <AnimatedSkeleton className="h-4 w-32" variant="rounded" />
          <AnimatedSkeleton className="h-3 w-48" variant="rounded" />
        </div>
      </div>

      {/* Image */}
      <AnimatedSkeleton className="aspect-[4/5] w-full" />

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          <AnimatedSkeleton className="h-6 w-6" variant="circular" />
          <AnimatedSkeleton className="h-6 w-6" variant="circular" />
          <AnimatedSkeleton className="h-6 w-6" variant="circular" />
        </div>
        <AnimatedSkeleton className="h-5 w-2/3" variant="rounded" />
        <AnimatedSkeleton className="h-4 w-full" variant="rounded" />
        <AnimatedSkeleton className="h-4 w-1/3" variant="rounded" />
      </div>
    </motion.div>
  )
}

// Profile skeleton
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Avatar and name */}
      <div className="flex items-center gap-4">
        <AnimatedSkeleton className="h-20 w-20" variant="circular" />
        <div className="flex-1 space-y-3">
          <AnimatedSkeleton className="h-6 w-48" variant="rounded" />
          <AnimatedSkeleton className="h-4 w-32" variant="rounded" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <AnimatedSkeleton className="h-8 w-12 mx-auto" variant="rounded" />
            <AnimatedSkeleton className="h-3 w-16 mx-auto" variant="rounded" />
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <AnimatedSkeleton className="h-4 w-full" variant="rounded" />
        <AnimatedSkeleton className="h-4 w-4/5" variant="rounded" />
      </div>
    </div>
  )
}

// Grid skeleton
interface GridSkeletonProps {
  count?: number
  columns?: number
  className?: string
}

export function GridSkeleton({ count = 6, columns = 3, className }: GridSkeletonProps) {
  return (
    <motion.div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1 }
          }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </motion.div>
  )
}

// Staggered list skeleton
interface ListSkeletonProps {
  count?: number
  className?: string
}

export function ListSkeleton({ count = 5, className }: ListSkeletonProps) {
  return (
    <motion.div
      className={cn("space-y-4", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08
          }
        }
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100"
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 }
          }}
        >
          <AnimatedSkeleton className="h-12 w-12" variant="circular" />
          <div className="flex-1 space-y-2">
            <AnimatedSkeleton className="h-4 w-48" variant="rounded" />
            <AnimatedSkeleton className="h-3 w-32" variant="rounded" />
          </div>
          <AnimatedSkeleton className="h-8 w-20" variant="rounded" />
        </motion.div>
      ))}
    </motion.div>
  )
}
