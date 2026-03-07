'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useHaptics } from '@/lib/hooks/useHaptics'

/**
 * StreakIndicator - Animated streak counter with fire effect
 *
 * Shows current streak with animated flame that grows with streak length
 */

interface StreakIndicatorProps {
  /** Current streak count */
  streak: number
  /** Maximum streak achieved (optional) */
  maxStreak?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show milestone celebrations */
  showMilestones?: boolean
  /** Callback when milestone is reached */
  onMilestone?: (milestone: number) => void
  className?: string
}

// Milestone thresholds for celebrations
const MILESTONES = [7, 14, 30, 60, 100, 365]

// Size configurations
const sizeConfig = {
  sm: {
    container: 'h-8 px-2 gap-1 text-sm',
    icon: 'w-4 h-4',
    text: 'text-sm font-semibold',
  },
  md: {
    container: 'h-10 px-3 gap-1.5 text-base',
    icon: 'w-5 h-5',
    text: 'text-base font-bold',
  },
  lg: {
    container: 'h-12 px-4 gap-2 text-lg',
    icon: 'w-6 h-6',
    text: 'text-lg font-bold',
  },
}

// Get flame intensity based on streak
function getFlameIntensity(streak: number): 'cool' | 'warm' | 'hot' | 'blazing' {
  if (streak >= 100) return 'blazing'
  if (streak >= 30) return 'hot'
  if (streak >= 7) return 'warm'
  return 'cool'
}

// Flame colors for different intensities
const flameColors = {
  cool: {
    primary: 'text-orange-400',
    secondary: 'text-yellow-400',
    glow: 'shadow-orange-400/30',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  warm: {
    primary: 'text-orange-500',
    secondary: 'text-yellow-500',
    glow: 'shadow-orange-500/40',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
  },
  hot: {
    primary: 'text-red-500',
    secondary: 'text-orange-500',
    glow: 'shadow-red-500/50',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  blazing: {
    primary: 'text-red-600',
    secondary: 'text-orange-400',
    glow: 'shadow-red-600/60',
    bg: 'bg-gradient-to-r from-red-50 to-orange-50',
    border: 'border-red-300',
  },
}

export function StreakIndicator({
  streak,
  maxStreak,
  size = 'md',
  showMilestones = true,
  onMilestone,
  className,
}: StreakIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const { triggerStreak } = useHaptics()
  const [showMilestoneEffect, setShowMilestoneEffect] = useState(false)
  const [prevStreak, setPrevStreak] = useState(streak)

  const config = sizeConfig[size]
  const intensity = getFlameIntensity(streak)
  const colors = flameColors[intensity]

  // Check for milestone achievements
  useEffect(() => {
    if (streak > prevStreak && showMilestones) {
      const hitMilestone = MILESTONES.find(m => prevStreak < m && streak >= m)
      if (hitMilestone) {
        triggerStreak()
        setShowMilestoneEffect(true)
        onMilestone?.(hitMilestone)
        setTimeout(() => setShowMilestoneEffect(false), 2000)
      }
    }
    setPrevStreak(streak)
  }, [streak, prevStreak, showMilestones, onMilestone, triggerStreak])

  if (streak === 0) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-full border bg-gray-50 border-gray-200',
        config.container,
        className
      )}>
        <Flame className={cn(config.icon, 'text-gray-300')} />
        <span className={cn(config.text, 'text-gray-400')}>0</span>
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        'inline-flex items-center rounded-full border relative overflow-hidden',
        config.container,
        colors.bg,
        colors.border,
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Animated flame */}
      <div className="relative">
        <motion.div
          className={cn(colors.primary)}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: [1, 1.1, 1],
                  rotate: [0, 3, -3, 0],
                }
          }
          transition={{
            duration: intensity === 'blazing' ? 0.3 : intensity === 'hot' ? 0.5 : 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Flame className={cn(config.icon, 'fill-current')} />
        </motion.div>

        {/* Glow effect for high streaks */}
        {(intensity === 'hot' || intensity === 'blazing') && !prefersReducedMotion && (
          <motion.div
            className={cn(
              'absolute inset-0 blur-sm',
              colors.primary
            )}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Flame className={cn(config.icon, 'fill-current')} />
          </motion.div>
        )}
      </div>

      {/* Streak count */}
      <motion.span
        key={streak}
        className={cn(config.text, 'text-gray-900')}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      >
        {streak}
      </motion.span>

      {/* Milestone celebration effect */}
      <AnimatePresence>
        {showMilestoneEffect && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn(
                  'absolute inset-0 rounded-full border-2',
                  colors.border
                )}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2 + i * 0.5, opacity: 0 }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.15,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * StreakCard - Detailed streak display with max streak and progress
 */
interface StreakCardProps {
  streak: number
  maxStreak: number
  lastActiveDate?: Date
  className?: string
}

export function StreakCard({
  streak,
  maxStreak,
  lastActiveDate,
  className,
}: StreakCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const intensity = getFlameIntensity(streak)
  const colors = flameColors[intensity]

  // Calculate next milestone
  const nextMilestone = MILESTONES.find(m => m > streak) || streak + 1

  // Check if streak is at risk (last active > 20 hours ago)
  const isAtRisk = lastActiveDate
    ? Date.now() - lastActiveDate.getTime() > 20 * 60 * 60 * 1000
    : false

  return (
    <motion.div
      className={cn(
        'rounded-2xl p-4 border',
        colors.bg,
        colors.border,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Large animated flame */}
          <motion.div
            className={cn(colors.primary, 'relative')}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }
            }
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Flame className="w-12 h-12 fill-current" />
            {(intensity === 'hot' || intensity === 'blazing') && !prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 blur-md"
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                }}
              >
                <Flame className={cn('w-12 h-12 fill-current', colors.secondary)} />
              </motion.div>
            )}
          </motion.div>

          <div>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={streak}
                className="text-3xl font-bold text-gray-900"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {streak}
              </motion.span>
              <span className="text-gray-600 font-medium">day streak</span>
            </div>
            {maxStreak > streak && (
              <p className="text-sm text-gray-500">
                Best: {maxStreak} days
              </p>
            )}
          </div>
        </div>

        {/* Status indicator */}
        {isAtRisk && (
          <motion.div
            className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          >
            Keep it going!
          </motion.div>
        )}
      </div>

      {/* Progress to next milestone */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Next milestone</span>
          <span className="font-medium text-gray-900">{nextMilestone} days</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full bg-gradient-to-r',
              intensity === 'blazing'
                ? 'from-red-400 via-orange-400 to-yellow-400'
                : intensity === 'hot'
                ? 'from-red-400 to-orange-400'
                : 'from-orange-400 to-yellow-400'
            )}
            initial={{ width: 0 }}
            animate={{
              width: `${(streak / nextMilestone) * 100}%`,
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {nextMilestone - streak} more {nextMilestone - streak === 1 ? 'day' : 'days'} to go
        </p>
      </div>
    </motion.div>
  )
}

/**
 * StreakLost - Component shown when streak is lost
 */
interface StreakLostProps {
  previousStreak: number
  onDismiss: () => void
  className?: string
}

export function StreakLost({
  previousStreak,
  onDismiss,
  className,
}: StreakLostProps) {
  return (
    <motion.div
      className={cn(
        'rounded-2xl p-6 bg-gray-50 border border-gray-200 text-center',
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* Broken flame icon */}
      <motion.div
        className="mx-auto mb-4 text-gray-300"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Flame className="w-16 h-16" />
      </motion.div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Streak Lost
      </h3>
      <p className="text-gray-600 mb-4">
        Your {previousStreak}-day streak has ended.
        <br />
        Start a new one today!
      </p>

      <motion.button
        onClick={onDismiss}
        className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Start Fresh
      </motion.button>
    </motion.div>
  )
}

export { MILESTONES, getFlameIntensity, flameColors }
