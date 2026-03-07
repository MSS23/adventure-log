'use client'

import { useState, useRef, useCallback, ReactNode } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Globe, RefreshCw } from 'lucide-react'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface PullToRefreshWrapperProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  className?: string
  disabled?: boolean
}

const PULL_THRESHOLD = 80
const MAX_PULL = 120

export function PullToRefreshWrapper({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshWrapperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const { triggerLight, triggerMedium } = useHaptics()
  const prefersReducedMotion = useReducedMotion()

  const pullDistance = useMotionValue(0)
  const progress = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 1])
  const rotation = useTransform(pullDistance, [0, MAX_PULL], [0, 360])
  const opacity = useTransform(pullDistance, [0, 30, PULL_THRESHOLD], [0, 0.5, 1])
  const scale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return

      const container = containerRef.current
      if (!container) return

      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop > 0) return

      startY.current = e.touches[0].clientY
      setIsPulling(true)
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return

      const container = containerRef.current
      if (!container) return

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      // Only pull down, not up
      if (diff < 0) {
        pullDistance.set(0)
        return
      }

      // Apply resistance to the pull
      const resistance = 0.5
      const resistedDiff = Math.min(diff * resistance, MAX_PULL)
      pullDistance.set(resistedDiff)

      // Haptic feedback at threshold
      const prevValue = pullDistance.getPrevious()
      if (resistedDiff >= PULL_THRESHOLD && (prevValue === undefined || prevValue < PULL_THRESHOLD)) {
        triggerMedium()
      }
    },
    [isPulling, disabled, isRefreshing, pullDistance, triggerMedium]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    setIsPulling(false)
    const distance = pullDistance.get()

    if (distance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      triggerLight()

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        pullDistance.set(0)
      }
    } else {
      // Animate back
      pullDistance.set(0)
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh, triggerLight])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
            style={{
              top: 0,
              height: pullDistance,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-2"
              style={{ opacity, scale }}
            >
              {isRefreshing ? (
                <motion.div
                  animate={prefersReducedMotion ? {} : { rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="h-8 w-8 text-teal-500" />
                </motion.div>
              ) : (
                <motion.div style={{ rotate: prefersReducedMotion ? 0 : rotation }}>
                  <Globe className="h-8 w-8 text-teal-500" />
                </motion.div>
              )}
              <motion.span
                className="text-xs text-gray-500 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {isRefreshing
                  ? 'Refreshing...'
                  : pullDistance.get() >= PULL_THRESHOLD
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with transform */}
      <motion.div
        style={{
          y: isPulling || isRefreshing ? pullDistance : 0,
        }}
        transition={
          !isPulling
            ? { type: 'spring', stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {children}
      </motion.div>
    </div>
  )
}

// Simple hook version for custom implementations
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const startY = useRef(0)
  const { triggerMedium, triggerLight } = useHaptics()

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (isRefreshing) return

      const diff = e.touches[0].clientY - startY.current
      if (diff > 0) {
        const progress = Math.min(diff / PULL_THRESHOLD, 1)
        setPullProgress(progress)

        if (progress >= 1 && pullProgress < 1) {
          triggerMedium()
        }
      }
    },
    onTouchEnd: async () => {
      if (pullProgress >= 1 && !isRefreshing) {
        setIsRefreshing(true)
        triggerLight()

        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
        }
      }
      setPullProgress(0)
    },
  }

  return {
    handlers,
    isRefreshing,
    pullProgress,
  }
}
