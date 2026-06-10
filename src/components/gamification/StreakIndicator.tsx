'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// Flame colors for different intensities — semantic tokens, both themes
const flameColors = {
  cool: {
    primary: 'text-[color:var(--color-gold)]',
    secondary: 'text-[color:var(--color-gold-soft)]',
    glow: '',
    bg: 'bg-[color:var(--color-gold)]/10',
    border: 'border-[color:var(--color-gold)]/25',
  },
  warm: {
    primary: 'text-accent',
    secondary: 'text-[color:var(--color-gold)]',
    glow: '',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
  hot: {
    primary: 'text-accent',
    secondary: 'text-[color:var(--color-gold)]',
    glow: '',
    bg: 'bg-accent/15',
    border: 'border-accent/30',
  },
  blazing: {
    primary: 'text-accent',
    secondary: 'text-[color:var(--color-gold)]',
    glow: '',
    bg: 'bg-accent/20',
    border: 'border-accent/40',
  },
}

export function StreakIndicator({
  streak,
  maxStreak: _maxStreak,
  size = 'md',
  showMilestones = true,
  onMilestone,
  className,
}: StreakIndicatorProps) {
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
        'inline-flex items-center rounded-full border bg-muted/60 border-border',
        config.container,
        className
      )}>
        <Flame className={cn(config.icon, 'text-muted-foreground/60')} />
        <span className={cn(config.text, 'text-muted-foreground')}>0</span>
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
      {/* Flame */}
      <div className={cn('relative', colors.primary)}>
        <Flame className={cn(config.icon, 'fill-current')} />
      </div>

      {/* Streak count */}
      <motion.span
        key={streak}
        className={cn(config.text, 'text-foreground')}
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
                  'absolute inset-0 rounded-full border',
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
        'rounded-2xl border border-border bg-card p-4',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Large flame */}
          <div className={cn(colors.primary, 'relative')}>
            <Flame className="w-12 h-12 fill-current" />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={streak}
                className="al-stat-value text-3xl"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {streak}
              </motion.span>
              <span className="text-muted-foreground font-medium">day streak</span>
            </div>
            {maxStreak > streak && (
              <p className="text-sm text-muted-foreground">
                Best: {maxStreak} days
              </p>
            )}
          </div>
        </div>

        {/* Status indicator */}
        {isAtRisk && (
          <div className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            Keep it going!
          </div>
        )}
      </div>

      {/* Progress to next milestone */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Next milestone</span>
          <span className="font-medium text-foreground">{nextMilestone} days</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{
              width: `${(streak / nextMilestone) * 100}%`,
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
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
        'rounded-2xl border border-border bg-card p-6 text-center',
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* Broken flame icon */}
      <motion.div
        className="mx-auto mb-4 text-muted-foreground/50"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Flame className="w-16 h-16" />
      </motion.div>

      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
        Streak Lost
      </h3>
      <p className="text-muted-foreground mb-4">
        Your {previousStreak}-day streak has ended.
        <br />
        Start a new one today!
      </p>

      <motion.button
        onClick={onDismiss}
        className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        Start Fresh
      </motion.button>
    </motion.div>
  )
}

export { MILESTONES, getFlameIntensity, flameColors }
