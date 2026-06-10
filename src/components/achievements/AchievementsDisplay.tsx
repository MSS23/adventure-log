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
import { Skeleton } from '@/components/ui/skeleton'
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
  },
  countries: {
    name: 'Countries',
    description: 'Explore the world one country at a time',
    icon: Globe,
  },
  photos: {
    name: 'Photography',
    description: 'Capture and share your memories',
    icon: Camera,
  },
  social: {
    name: 'Social',
    description: 'Connect with fellow travelers',
    icon: Users,
  },
  streaks: {
    name: 'Streaks',
    description: 'Consistency is key to great adventures',
    icon: Flame,
  }
}

// Rarity chips — semantic status recipes that work in both themes
const rarityChip = {
  common: 'bg-muted text-muted-foreground border border-border',
  rare: 'bg-primary/10 text-primary border border-primary/20',
  epic: 'bg-accent/10 text-accent border border-accent/20',
  legendary: 'bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] border border-[color:var(--color-gold)]/25',
}

const rarityBar = {
  common: 'bg-muted-foreground/60',
  rare: 'bg-primary',
  epic: 'bg-accent',
  legendary: 'bg-[color:var(--color-gold)]',
}

const rarityIconBg = {
  common: 'bg-muted',
  rare: 'bg-primary/10',
  epic: 'bg-accent/10',
  legendary: 'bg-[color:var(--color-gold)]/15',
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
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>

        {/* Category skeletons */}
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="al-stat-value text-2xl sm:text-3xl text-primary">{totalEarned}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Earned</div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="al-stat-value text-2xl sm:text-3xl">{totalAvailable - totalEarned}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Remaining</div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="al-stat-value text-2xl sm:text-3xl">
            {totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0}%
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">Complete</div>
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
            className="overflow-hidden rounded-2xl border border-border bg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.05 }}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center justify-between p-4 cursor-pointer transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CategoryIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-heading font-semibold text-foreground">{config.name}</h3>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tracking-wide text-muted-foreground">
                  {earnedInCategory}/{categoryAchievements.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
  const rarity = achievement.rarity as keyof typeof rarityChip

  return (
    <motion.div
      className={cn(
        "relative flex items-center gap-3 rounded-xl bg-muted/50 p-3",
        !achievement.isEarned && 'opacity-70'
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      {/* Achievement Icon */}
      <div className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
        achievement.isEarned ? rarityIconBg[rarity] : 'bg-muted'
      )}>
        {achievement.isEarned ? (
          <span className="text-xl">{achievement.icon}</span>
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}

        {/* Earned checkmark */}
        {achievement.isEarned && (
          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-2 ring-card">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Achievement Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "font-medium text-sm truncate",
            achievement.isEarned ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {achievement.name}
          </h4>
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            rarityChip[rarity]
          )}>
            {rarity}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>

        {/* Progress Bar */}
        {!achievement.isEarned && (
          <div className="mt-2">
            <div className="flex justify-between font-mono text-xs tracking-wide text-muted-foreground mb-1">
              <span>{achievement.currentValue}/{achievement.threshold}</span>
              <span>{achievement.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", rarityBar[rarity])}
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Earned Date */}
        {achievement.isEarned && achievement.earnedAt && (
          <p className="font-mono text-xs tracking-wide text-muted-foreground mt-1">
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
