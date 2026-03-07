'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, Trophy, MapPin, Camera, Users, Globe, Star, Flame, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { ConfettiCelebration } from '@/components/animations/ConfettiCelebration'
import { Button } from '@/components/ui/button'

/**
 * AchievementUnlock - Full-screen celebration for unlocking achievements
 *
 * Features:
 * - Full-screen overlay with gradient background
 * - Confetti burst
 * - Badge animation with glow
 * - Share to social prompt
 * - Haptic feedback
 */

export type AchievementType =
  | 'first_album'
  | 'countries_5'
  | 'countries_10'
  | 'countries_25'
  | 'countries_50'
  | 'photos_100'
  | 'photos_500'
  | 'photos_1000'
  | 'followers_10'
  | 'followers_100'
  | 'followers_1000'
  | 'likes_100'
  | 'likes_1000'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'globe_explorer'
  | 'social_butterfly'
  | 'storyteller'
  | 'custom'

export interface Achievement {
  id: string
  type: AchievementType
  title: string
  description: string
  icon?: React.ReactNode
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: Date
}

interface AchievementUnlockProps {
  achievement: Achievement
  show: boolean
  onClose: () => void
  onShare?: () => void
  autoClose?: number // milliseconds, 0 to disable
}

// Achievement icon mapping
const achievementIcons: Record<string, React.ReactNode> = {
  first_album: <Camera className="w-10 h-10" />,
  countries_5: <Globe className="w-10 h-10" />,
  countries_10: <Globe className="w-10 h-10" />,
  countries_25: <Globe className="w-10 h-10" />,
  countries_50: <Globe className="w-10 h-10" />,
  photos_100: <Camera className="w-10 h-10" />,
  photos_500: <Camera className="w-10 h-10" />,
  photos_1000: <Camera className="w-10 h-10" />,
  followers_10: <Users className="w-10 h-10" />,
  followers_100: <Users className="w-10 h-10" />,
  followers_1000: <Users className="w-10 h-10" />,
  likes_100: <Heart className="w-10 h-10" />,
  likes_1000: <Heart className="w-10 h-10" />,
  streak_7: <Flame className="w-10 h-10" />,
  streak_30: <Flame className="w-10 h-10" />,
  streak_100: <Flame className="w-10 h-10" />,
  globe_explorer: <MapPin className="w-10 h-10" />,
  social_butterfly: <Users className="w-10 h-10" />,
  storyteller: <Star className="w-10 h-10" />,
}

// Rarity colors and effects
const rarityStyles = {
  common: {
    gradient: 'from-gray-400 via-gray-500 to-gray-600',
    glow: 'shadow-gray-400/50',
    badge: 'bg-gradient-to-br from-gray-100 to-gray-300',
    text: 'text-gray-700',
  },
  rare: {
    gradient: 'from-blue-400 via-cyan-500 to-teal-500',
    glow: 'shadow-cyan-400/50',
    badge: 'bg-gradient-to-br from-blue-100 to-cyan-200',
    text: 'text-cyan-700',
  },
  epic: {
    gradient: 'from-purple-400 via-violet-500 to-purple-600',
    glow: 'shadow-purple-400/50',
    badge: 'bg-gradient-to-br from-purple-100 to-violet-200',
    text: 'text-purple-700',
  },
  legendary: {
    gradient: 'from-yellow-400 via-orange-500 to-red-500',
    glow: 'shadow-orange-400/50',
    badge: 'bg-gradient-to-br from-yellow-100 to-orange-200',
    text: 'text-orange-700',
  },
}

export function AchievementUnlock({
  achievement,
  show,
  onClose,
  onShare,
  autoClose = 5000,
}: AchievementUnlockProps) {
  const prefersReducedMotion = useReducedMotion()
  const { triggerAchievement, triggerCelebrate } = useHaptics()
  const [showConfetti, setShowConfetti] = useState(false)

  const rarity = achievement.rarity || 'common'
  const styles = rarityStyles[rarity]
  const icon = achievement.icon || achievementIcons[achievement.type] || <Trophy className="w-10 h-10" />

  useEffect(() => {
    if (show) {
      // Trigger haptics
      triggerAchievement()
      setTimeout(() => triggerCelebrate(), 300)

      // Start confetti after a brief delay
      const confettiTimer = setTimeout(() => setShowConfetti(true), 200)

      // Auto-close if enabled
      let closeTimer: NodeJS.Timeout | undefined
      if (autoClose > 0) {
        closeTimer = setTimeout(onClose, autoClose)
      }

      return () => {
        clearTimeout(confettiTimer)
        if (closeTimer) clearTimeout(closeTimer)
      }
    } else {
      setShowConfetti(false)
    }
  }, [show, autoClose, onClose, triggerAchievement, triggerCelebrate])

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }

    // Default share behavior
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I unlocked "${achievement.title}"!`,
          text: achievement.description,
          url: window.location.origin,
        })
      } catch {
        // User cancelled
      }
    }
  }, [achievement, onShare])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className={cn(
              'absolute inset-0 bg-gradient-to-br',
              styles.gradient,
              'bg-opacity-95'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Confetti */}
          <ConfettiCelebration
            show={showConfetti}
            count={80}
            duration={4}
            haptic={false}
          />

          {/* Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center p-8 max-w-md"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.1,
            }}
          >
            {/* Close button */}
            <motion.button
              className="absolute top-0 right-0 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Rarity label */}
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                'bg-white/20 text-white backdrop-blur-sm'
              )}>
                {rarity} Achievement
              </span>
            </motion.div>

            {/* Badge with glow effect */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.3,
              }}
            >
              {/* Animated glow ring */}
              {!prefersReducedMotion && (
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full blur-xl',
                    styles.badge
                  )}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}

              {/* Badge */}
              <motion.div
                className={cn(
                  'relative w-28 h-28 rounded-full flex items-center justify-center',
                  styles.badge,
                  'shadow-2xl',
                  styles.glow
                )}
                whileHover={{ scale: 1.05 }}
              >
                <div className={styles.text}>
                  {icon}
                </div>
              </motion.div>

              {/* Sparkles around badge */}
              {!prefersReducedMotion && (
                <>
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <motion.div
                      key={angle}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * 70}px)`,
                        top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * 70}px)`,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.5 + i * 0.1,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                  ))}
                </>
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {achievement.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              className="text-lg text-white/80 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {achievement.description}
            </motion.p>

            {/* Action buttons */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={handleShare}
                className="bg-white text-gray-900 hover:bg-white/90 font-semibold px-6"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-semibold px-6"
              >
                Continue
              </Button>
            </motion.div>

            {/* Tap to dismiss hint */}
            <motion.p
              className="mt-6 text-sm text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * AchievementBadge - Small inline badge for displaying achievements
 */
interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  showLabel?: boolean
  className?: string
}

const badgeSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function AchievementBadge({
  achievement,
  size = 'md',
  onClick,
  showLabel = false,
  className,
}: AchievementBadgeProps) {
  const rarity = achievement.rarity || 'common'
  const styles = rarityStyles[rarity]
  const icon = achievement.icon || achievementIcons[achievement.type] || <Trophy />

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-1', className)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={onClick}
        className={cn(
          'rounded-full flex items-center justify-center',
          badgeSizes[size],
          styles.badge,
          'shadow-md hover:shadow-lg transition-shadow',
          onClick && 'cursor-pointer'
        )}
      >
        <div className={cn(styles.text, iconSizes[size])}>
          {icon}
        </div>
      </button>
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium text-center line-clamp-1 max-w-[80px]">
          {achievement.title}
        </span>
      )}
    </motion.div>
  )
}

/**
 * AchievementProgress - Shows progress toward an achievement
 */
interface AchievementProgressProps {
  achievement: Achievement
  current: number
  target: number
  className?: string
}

export function AchievementProgress({
  achievement,
  current,
  target,
  className,
}: AchievementProgressProps) {
  const progress = Math.min((current / target) * 100, 100)
  const rarity = achievement.rarity || 'common'
  const styles = rarityStyles[rarity]
  const icon = achievement.icon || achievementIcons[achievement.type] || <Trophy />

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-gray-50', className)}>
      {/* Icon */}
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
        progress >= 100 ? styles.badge : 'bg-gray-200'
      )}>
        <div className={cn(
          progress >= 100 ? styles.text : 'text-gray-400',
          'w-6 h-6'
        )}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-gray-900 text-sm truncate">
            {achievement.title}
          </h4>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {current}/{target}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full bg-gradient-to-r',
              styles.gradient
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * AchievementGrid - Grid display of multiple achievements
 */
interface AchievementGridProps {
  achievements: Achievement[]
  onAchievementClick?: (achievement: Achievement) => void
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AchievementGrid({
  achievements,
  onAchievementClick,
  showLabels = true,
  size = 'md',
  className,
}: AchievementGridProps) {
  return (
    <motion.div
      className={cn('grid grid-cols-4 gap-4', className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      }}
    >
      {achievements.map((achievement, index) => (
        <motion.div
          key={achievement.id}
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1 },
          }}
        >
          <AchievementBadge
            achievement={achievement}
            size={size}
            showLabel={showLabels}
            onClick={() => onAchievementClick?.(achievement)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

export { achievementIcons, rarityStyles }
