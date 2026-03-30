'use client'

/**
 * AchievementsDisplay
 *
 * Comprehensive display of all achievements with progress tracking.
 * Shows both earned and unearned achievements organized by category.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Globe, Camera, Users, Flame, Lock, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMyAchievementProgress } from '@/app/actions/achievements'
import type { AchievementProgress } from '@/lib/services/achievement-service'
import { log } from '@/lib/utils/logger'

interface AchievementsDisplayProps {
  className?: string
}

const categoryConfig = {
  journey: {
    name: 'Journey',
    description: 'Milestones in your travel adventures',
    icon: Trophy,
    gradient: 'from-olive-500 to-olive-500',
    bgGradient: 'from-olive-50 to-olive-50'
  },
  countries: {
    name: 'Countries',
    description: 'Explore the world one country at a time',
    icon: Globe,
    gradient: 'from-olive-500 to-olive-500',
    bgGradient: 'from-olive-50 to-olive-50'
  },
  photos: {
    name: 'Photography',
    description: 'Capture and share your memories',
    icon: Camera,
    gradient: 'from-olive-500 to-pink-500',
    bgGradient: 'from-olive-50 to-pink-50'
  },
  social: {
    name: 'Social',
    description: 'Connect with fellow travelers',
    icon: Users,
    gradient: 'from-green-500 to-olive-500',
    bgGradient: 'from-green-50 to-olive-50'
  },
  streaks: {
    name: 'Streaks',
    description: 'Consistency is key to great adventures',
    icon: Flame,
    gradient: 'from-red-500 to-olive-500',
    bgGradient: 'from-red-50 to-olive-50'
  }
}

const rarityColors = {
  common: 'from-stone-400 to-stone-500',
  rare: 'from-olive-400 to-olive-500',
  epic: 'from-olive-400 to-olive-500',
  legendary: 'from-yellow-400 to-olive-500'
}

const rarityBorder = {
  common: 'border-stone-200',
  rare: 'border-olive-200',
  epic: 'border-olive-200',
  legendary: 'border-yellow-200'
}

export function AchievementsDisplay({ className }: AchievementsDisplayProps) {
  const [progress, setProgress] = useState<AchievementProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['journey', 'countries', 'photos', 'social', 'streaks']))

  useEffect(() => {
    async function fetchProgress() {
      try {
        setIsLoading(true)
        const result = await getMyAchievementProgress()

        if (result.success) {
          setProgress(result.progress)
        } else {
          setError(result.error || 'Failed to load achievements')
        }
      } catch (err) {
        log.error('Failed to fetch achievement progress', {
          component: 'AchievementsDisplay'
        }, err instanceof Error ? err : new Error(String(err)))
        setError('Failed to load achievements')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgress()
  }, [])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Group achievements by category
  const groupedAchievements = progress.reduce((acc, achievement) => {
    const category = achievement.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(achievement)
    return acc
  }, {} as Record<string, AchievementProgress[]>)

  // Calculate stats
  const totalEarned = progress.filter(a => a.isEarned).length
  const totalAvailable = progress.length

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-stone-100 dark:bg-stone-800 rounded-xl h-20 animate-pulse" />
          ))}
        </div>

        {/* Category skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-stone-100 dark:bg-stone-800 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          className="bg-gradient-to-br from-olive-50 to-olive-50 dark:from-olive-950/40 dark:to-olive-900/20 rounded-xl p-4 text-center border border-olive-100 dark:border-olive-800/40 transition-all duration-200 hover:shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-2xl sm:text-3xl font-bold text-olive-600 dark:text-olive-400">{totalEarned}</div>
          <div className="text-sm text-olive-700/70 dark:text-olive-400/70">Earned</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-stone-50 to-stone-50 dark:from-stone-800/40 dark:to-stone-800/20 rounded-xl p-4 text-center border border-stone-100 dark:border-stone-700 transition-all duration-200 hover:shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="text-2xl sm:text-3xl font-bold text-stone-600 dark:text-stone-300">{totalAvailable - totalEarned}</div>
          <div className="text-sm text-stone-500 dark:text-stone-400">Remaining</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-olive-50 to-olive-50 dark:from-olive-950/40 dark:to-olive-900/20 rounded-xl p-4 text-center border border-olive-100 dark:border-olive-800/40 transition-all duration-200 hover:shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-2xl sm:text-3xl font-bold text-olive-600 dark:text-olive-400">
            {totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0}%
          </div>
          <div className="text-sm text-olive-700/70 dark:text-olive-400/70">Complete</div>
        </motion.div>
      </div>

      {/* Achievement Categories */}
      {Object.entries(categoryConfig).map(([categoryKey, config], categoryIndex) => {
        const categoryAchievements = groupedAchievements[categoryKey] || []
        const earnedInCategory = categoryAchievements.filter(a => a.isEarned).length
        const isExpanded = expandedCategories.has(categoryKey)
        const CategoryIcon = config.icon

        return (
          <motion.div
            key={categoryKey}
            className={cn(
              "rounded-xl border overflow-hidden",
              "bg-gradient-to-br",
              config.bgGradient,
              "dark:from-stone-900/50 dark:to-stone-900/30",
              "border-stone-200 dark:border-stone-700"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.05 }}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/30 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-500 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                  config.gradient
                )}>
                  <CategoryIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">{config.name}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  {earnedInCategory}/{categoryAchievements.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-stone-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-stone-400" />
                )}
              </div>
            </button>

            {/* Achievement Grid */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryAchievements.map((achievement, index) => (
                      <AchievementCard
                        key={achievement.type}
                        achievement={achievement}
                        index={index}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

interface AchievementCardProps {
  achievement: AchievementProgress
  index: number
}

function AchievementCard({ achievement, index }: AchievementCardProps) {
  const rarity = achievement.rarity as keyof typeof rarityColors

  return (
    <motion.div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-[#111] transition-all duration-200 hover:shadow-sm",
        achievement.isEarned ? cn(rarityBorder[rarity], 'dark:border-olive-800/50') : 'border-stone-200 dark:border-stone-700',
        !achievement.isEarned && 'opacity-75'
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      {/* Achievement Icon */}
      <div className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
        achievement.isEarned
          ? `bg-gradient-to-br ${rarityColors[rarity]}`
          : 'bg-stone-100 dark:bg-stone-800'
      )}>
        {achievement.isEarned ? (
          <span className="text-xl">{achievement.icon}</span>
        ) : (
          <Lock className="h-5 w-5 text-stone-400 dark:text-stone-500" />
        )}

        {/* Earned checkmark */}
        {achievement.isEarned && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Achievement Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "font-medium text-sm truncate",
            achievement.isEarned ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'
          )}>
            {achievement.name}
          </h4>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium capitalize",
            rarity === 'common' && 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
            rarity === 'rare' && 'bg-olive-100 dark:bg-olive-900/40 text-olive-600 dark:text-olive-400',
            rarity === 'epic' && 'bg-olive-100 dark:bg-olive-900/40 text-olive-600 dark:text-olive-400',
            rarity === 'legendary' && 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
          )}>
            {rarity}
          </span>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{achievement.description}</p>

        {/* Progress Bar */}
        {!achievement.isEarned && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
              <span>{achievement.currentValue}/{achievement.threshold}</span>
              <span>{achievement.progress}%</span>
            </div>
            <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r", rarityColors[rarity])}
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Earned Date */}
        {achievement.isEarned && achievement.earnedAt && (
          <p className="text-xs text-stone-400 mt-1">
            Earned {new Date(achievement.earnedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </motion.div>
  )
}
