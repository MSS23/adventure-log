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
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 to-orange-50'
  },
  countries: {
    name: 'Countries',
    description: 'Explore the world one country at a time',
    icon: Globe,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50'
  },
  photos: {
    name: 'Photography',
    description: 'Capture and share your memories',
    icon: Camera,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  social: {
    name: 'Social',
    description: 'Connect with fellow travelers',
    icon: Users,
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 to-teal-50'
  },
  streaks: {
    name: 'Streaks',
    description: 'Consistency is key to great adventures',
    icon: Flame,
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-50 to-orange-50'
  }
}

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-cyan-500',
  epic: 'from-purple-400 to-violet-500',
  legendary: 'from-yellow-400 to-orange-500'
}

const rarityBorder = {
  common: 'border-gray-200',
  rare: 'border-blue-200',
  epic: 'border-purple-200',
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
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
          ))}
        </div>

        {/* Category skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 text-center border border-amber-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-3xl font-bold text-amber-600">{totalEarned}</div>
          <div className="text-sm text-amber-700/70">Earned</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 text-center border border-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="text-3xl font-bold text-gray-600">{totalAvailable - totalEarned}</div>
          <div className="text-sm text-gray-500">Remaining</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 text-center border border-teal-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-3xl font-bold text-teal-600">
            {totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0}%
          </div>
          <div className="text-sm text-teal-700/70">Complete</div>
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
              "border-gray-200"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.05 }}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                  config.gradient
                )}>
                  <CategoryIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-xs text-gray-600">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">
                  {earnedInCategory}/{categoryAchievements.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
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
        "relative flex items-center gap-3 p-3 rounded-lg border bg-white",
        achievement.isEarned ? rarityBorder[rarity] : 'border-gray-200',
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
          : 'bg-gray-100'
      )}>
        {achievement.isEarned ? (
          <span className="text-xl">{achievement.icon}</span>
        ) : (
          <Lock className="h-5 w-5 text-gray-400" />
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
            achievement.isEarned ? 'text-gray-900' : 'text-gray-500'
          )}>
            {achievement.name}
          </h4>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium capitalize",
            rarity === 'common' && 'bg-gray-100 text-gray-600',
            rarity === 'rare' && 'bg-blue-100 text-blue-600',
            rarity === 'epic' && 'bg-purple-100 text-purple-600',
            rarity === 'legendary' && 'bg-yellow-100 text-yellow-700'
          )}>
            {rarity}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{achievement.description}</p>

        {/* Progress Bar */}
        {!achievement.isEarned && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{achievement.currentValue}/{achievement.threshold}</span>
              <span>{achievement.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
          <p className="text-xs text-gray-400 mt-1">
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
