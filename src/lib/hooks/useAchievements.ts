'use client'

/**
 * useAchievements Hook
 *
 * Client-side hook for managing achievement state, checking for new
 * achievements, and displaying progress.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  checkAchievements,
  getMyAchievements,
  getMyAchievementProgress
} from '@/app/actions/achievements'
import type { NewlyEarnedAchievement, EarnedAchievement, AchievementProgress, UserStats } from '@/lib/services/achievement-service'
import { log } from '@/lib/utils/logger'

interface UseAchievementsReturn {
  // State
  earnedAchievements: EarnedAchievement[]
  progress: AchievementProgress[]
  stats: UserStats | null
  pendingNotifications: NewlyEarnedAchievement[]
  isLoading: boolean
  error: string | null

  // Actions
  checkForNewAchievements: () => Promise<NewlyEarnedAchievement[]>
  refreshAchievements: () => Promise<void>
  dismissNotification: (achievementType: string) => void
  dismissAllNotifications: () => void

  // Computed
  totalEarned: number
  totalAvailable: number
  completionPercentage: number
}

export function useAchievements(): UseAchievementsReturn {
  const { user } = useAuth()
  const [earnedAchievements, setEarnedAchievements] = useState<EarnedAchievement[]>([])
  const [progress, setProgress] = useState<AchievementProgress[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pendingNotifications, setPendingNotifications] = useState<NewlyEarnedAchievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch achievements on mount and when user changes
  const refreshAchievements = useCallback(async () => {
    if (!user) {
      setEarnedAchievements([])
      setProgress([])
      setStats(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [achievementsResult, progressResult] = await Promise.all([
        getMyAchievements(),
        getMyAchievementProgress()
      ])

      if (achievementsResult.success) {
        setEarnedAchievements(achievementsResult.achievements)
      } else {
        setError(achievementsResult.error || 'Failed to load achievements')
      }

      if (progressResult.success) {
        setProgress(progressResult.progress)
        setStats(progressResult.stats)
      }
    } catch (err) {
      log.error('Failed to refresh achievements', {
        component: 'useAchievements',
        action: 'refreshAchievements'
      }, err instanceof Error ? err : new Error(String(err)))
      setError('Failed to load achievements')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Check for new achievements
  const checkForNewAchievements = useCallback(async (): Promise<NewlyEarnedAchievement[]> => {
    if (!user) return []

    try {
      const result = await checkAchievements()

      if (result.success && result.newAchievements.length > 0) {
        // Add to pending notifications
        setPendingNotifications(prev => [...prev, ...result.newAchievements])

        // Refresh achievements list
        await refreshAchievements()

        log.info('New achievements unlocked', {
          component: 'useAchievements',
          action: 'checkForNewAchievements',
          count: result.newAchievements.length,
          achievements: result.newAchievements.map(a => a.type)
        })

        return result.newAchievements
      }

      return []
    } catch (err) {
      log.error('Failed to check for new achievements', {
        component: 'useAchievements',
        action: 'checkForNewAchievements'
      }, err instanceof Error ? err : new Error(String(err)))
      return []
    }
  }, [user, refreshAchievements])

  // Dismiss a single notification
  const dismissNotification = useCallback((achievementType: string) => {
    setPendingNotifications(prev =>
      prev.filter(a => a.type !== achievementType)
    )
  }, [])

  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setPendingNotifications([])
  }, [])

  // Initial load
  useEffect(() => {
    refreshAchievements()
  }, [refreshAchievements])

  // Computed values
  const totalEarned = earnedAchievements.length
  const totalAvailable = progress.length
  const completionPercentage = totalAvailable > 0
    ? Math.round((totalEarned / totalAvailable) * 100)
    : 0

  return {
    earnedAchievements,
    progress,
    stats,
    pendingNotifications,
    isLoading,
    error,
    checkForNewAchievements,
    refreshAchievements,
    dismissNotification,
    dismissAllNotifications,
    totalEarned,
    totalAvailable,
    completionPercentage
  }
}

/**
 * Hook for using the achievement notification context
 * This is a simpler hook just for triggering achievement checks
 */
export function useAchievementCheck() {
  const { user } = useAuth()

  const triggerCheck = useCallback(async (): Promise<NewlyEarnedAchievement[]> => {
    if (!user) return []

    try {
      const result = await checkAchievements()
      return result.success ? result.newAchievements : []
    } catch {
      return []
    }
  }, [user])

  return { triggerCheck }
}
