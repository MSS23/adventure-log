'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { RefreshCw, ArrowDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  className?: string
  threshold?: number
  maxPull?: number
  disabled?: boolean
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done'

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 80,
  maxPull = 140,
  disabled = false,
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const pullDistance = useMotionValue(0)

  // Derived animations
  const pullProgress = useTransform(pullDistance, [0, threshold], [0, 1])
  const spinnerRotation = useTransform(pullDistance, [0, threshold], [0, 360])
  const spinnerScale = useTransform(pullDistance, [0, threshold * 0.5, threshold], [0.5, 0.8, 1])
  const indicatorOpacity = useTransform(pullDistance, [0, threshold * 0.3], [0, 1])
  const contentY = useTransform(pullDistance, (v) => Math.min(v * 0.5, maxPull * 0.5))

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || state === 'refreshing') return

    // Only trigger if scrolled to top
    const scrollTop = containerRef.current?.scrollTop || 0
    if (scrollTop > 0) return

    startY.current = e.touches[0].clientY
    setState('idle')
  }, [disabled, state])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || state === 'refreshing') return
    if (!startY.current) return

    const scrollTop = containerRef.current?.scrollTop || 0
    if (scrollTop > 0) {
      startY.current = 0
      pullDistance.set(0)
      return
    }

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    // Only allow pull down
    if (diff <= 0) {
      pullDistance.set(0)
      setState('idle')
      return
    }

    // Apply resistance
    const pull = Math.min(diff * 0.5, maxPull)
    pullDistance.set(pull)

    if (pull >= threshold) {
      setState('ready')
    } else {
      setState('pulling')
    }
  }, [disabled, state, maxPull, threshold, pullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return

    const currentPull = pullDistance.get()

    if (currentPull >= threshold && state === 'ready') {
      setState('refreshing')

      // Animate to fixed position while refreshing
      pullDistance.set(60)

      try {
        await onRefresh()
        setState('done')

        // Brief success state
        await new Promise((r) => setTimeout(r, 500))
      } catch {
        // Silently fail
      } finally {
        setState('idle')
        pullDistance.set(0)
      }
    } else {
      setState('idle')
      pullDistance.set(0)
    }

    startY.current = 0
  }, [disabled, threshold, state, pullDistance, onRefresh])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{
          y: useTransform(pullDistance, (v) => Math.min(v * 0.5, maxPull * 0.5) - 48),
          opacity: indicatorOpacity,
        }}
      >
        <div className="bg-white shadow-lg rounded-full p-3 border border-gray-100">
          <AnimatePresence mode="wait">
            {state === 'idle' || state === 'pulling' ? (
              <motion.div
                key="arrow"
                style={{ rotate: spinnerRotation, scale: spinnerScale }}
              >
                <ArrowDown className="h-5 w-5 text-gray-500" />
              </motion.div>
            ) : state === 'ready' ? (
              <motion.div
                key="ready"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <RefreshCw className="h-5 w-5 text-teal-500" />
              </motion.div>
            ) : state === 'refreshing' ? (
              <motion.div
                key="refreshing"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="h-5 w-5 text-teal-500" />
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="h-5 w-5 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Status text */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 top-3 z-10 pointer-events-none"
        style={{ opacity: indicatorOpacity }}
      >
        <motion.span
          className="text-xs font-medium text-gray-500"
          key={state}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {state === 'pulling' && 'Pull to refresh'}
          {state === 'ready' && 'Release to refresh'}
          {state === 'refreshing' && 'Refreshing...'}
          {state === 'done' && 'Updated!'}
        </motion.span>
      </motion.div>

      {/* Content container */}
      <motion.div style={{ y: contentY }}>
        {children}
      </motion.div>
    </div>
  )
}

/**
 * Simple refresh button for manual refresh
 */
export function RefreshButton({
  onRefresh,
  className,
}: {
  onRefresh: () => Promise<void>
  className?: string
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <motion.button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        'p-2 rounded-full bg-white shadow-md border border-gray-100',
        'hover:bg-gray-50 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={isRefreshing ? { rotate: 360 } : {}}
        transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
      >
        <RefreshCw className="h-5 w-5 text-gray-600" />
      </motion.div>
    </motion.button>
  )
}
