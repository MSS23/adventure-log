'use server'

/**
 * Achievement Server Actions
 *
 * Server-side actions for checking and retrieving achievements.
 * These actions are called from client components and hooks.
 */

import { createClient } from '@/lib/supabase/server'
import {
  checkAndAwardAchievements,
  getEarnedAchievements,
  getAchievementProgress,
  getUserStats,
  type NewlyEarnedAchievement,
  type EarnedAchievement,
  type AchievementProgress,
  type UserStats
} from '@/lib/services/achievement-service'
import { log } from '@/lib/utils/logger'

export interface CheckAchievementsResult {
  success: boolean
  newAchievements: NewlyEarnedAchievement[]
  error?: string
}

export interface GetAchievementsResult {
  success: boolean
  achievements: EarnedAchievement[]
  error?: string
}

export interface GetProgressResult {
  success: boolean
  progress: AchievementProgress[]
  stats: UserStats | null
  error?: string
}

/**
 * Check for new achievements and award them
 * Call this after actions that might trigger achievements
 * (album creation, photo upload, etc.)
 */
export async function checkAchievements(): Promise<CheckAchievementsResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        newAchievements: [],
        error: 'Authentication required'
      }
    }

    const newAchievements = await checkAndAwardAchievements(user.id)

    return {
      success: true,
      newAchievements
    }
  } catch (error) {
    log.error('Failed to check achievements', {
      component: 'achievements-actions',
      action: 'checkAchievements'
    }, error instanceof Error ? error : new Error(String(error)))

    return {
      success: false,
      newAchievements: [],
      error: 'Failed to check achievements'
    }
  }
}

/**
 * Get all achievements earned by the current user
 */
export async function getMyAchievements(): Promise<GetAchievementsResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        achievements: [],
        error: 'Authentication required'
      }
    }

    const achievements = await getEarnedAchievements(user.id)

    return {
      success: true,
      achievements
    }
  } catch (error) {
    log.error('Failed to get achievements', {
      component: 'achievements-actions',
      action: 'getMyAchievements'
    }, error instanceof Error ? error : new Error(String(error)))

    return {
      success: false,
      achievements: [],
      error: 'Failed to get achievements'
    }
  }
}

/**
 * Get progress toward all achievements for the current user
 */
export async function getMyAchievementProgress(): Promise<GetProgressResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        progress: [],
        stats: null,
        error: 'Authentication required'
      }
    }

    const [progress, stats] = await Promise.all([
      getAchievementProgress(user.id),
      getUserStats(user.id)
    ])

    return {
      success: true,
      progress,
      stats
    }
  } catch (error) {
    log.error('Failed to get achievement progress', {
      component: 'achievements-actions',
      action: 'getMyAchievementProgress'
    }, error instanceof Error ? error : new Error(String(error)))

    return {
      success: false,
      progress: [],
      stats: null,
      error: 'Failed to get achievement progress'
    }
  }
}

/**
 * Get achievements for a specific user (for viewing profiles)
 */
export async function getUserAchievements(userId: string): Promise<GetAchievementsResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        achievements: [],
        error: 'Authentication required'
      }
    }

    const achievements = await getEarnedAchievements(userId)

    return {
      success: true,
      achievements
    }
  } catch (error) {
    log.error('Failed to get user achievements', {
      component: 'achievements-actions',
      action: 'getUserAchievements',
      userId
    }, error instanceof Error ? error : new Error(String(error)))

    return {
      success: false,
      achievements: [],
      error: 'Failed to get achievements'
    }
  }
}
