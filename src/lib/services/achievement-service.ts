/**
 * Achievement Service
 *
 * Core logic for checking user stats and awarding achievements.
 * This service should be called from server actions.
 */

import { createClient } from '@/lib/supabase/server'
import {
  ACHIEVEMENTS,
  getAchievementByType,
  getEligibleAchievements,
  getProgressToNext,
  type AchievementDefinition,
  type AchievementCheckType
} from '@/lib/achievements/achievement-definitions'
import { log } from '@/lib/utils/logger'

export interface UserStats {
  albums: number
  countries: number
  photos: number
  followers: number
  likes: number
  streak: number
}

export interface EarnedAchievement {
  id: string
  type: string
  name: string
  description: string
  icon: string
  rarity: string
  earnedAt: string
}

export interface NewlyEarnedAchievement extends EarnedAchievement {
  isNew: true
}

export interface AchievementProgress {
  type: string
  name: string
  description: string
  icon: string
  rarity: string
  category: string
  threshold: number
  currentValue: number
  progress: number
  isEarned: boolean
  earnedAt?: string
}

/**
 * Get user stats for achievement checking
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createClient()

  try {
    // Run all queries in parallel for better performance
    const [
      albumsResult,
      photosResult,
      followersResult,
      likesResult
    ] = await Promise.all([
      // Count albums and unique countries
      supabase
        .from('albums')
        .select('id, country_code')
        .eq('user_id', userId),

      // Count photos
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Count followers
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId)
        .eq('status', 'accepted'),

      // Count likes received on user's albums
      supabase
        .from('likes')
        .select('id, albums!inner(user_id)', { count: 'exact', head: true })
        .eq('albums.user_id', userId)
    ])

    // Calculate unique countries from albums
    const albumsData = albumsResult.data || []
    const uniqueCountries = new Set(
      albumsData.filter(a => a.country_code).map(a => a.country_code)
    )

    // Calculate streak (simplified - based on album creation dates)
    const streak = await calculateStreak(userId, supabase)

    return {
      albums: albumsData.length,
      countries: uniqueCountries.size,
      photos: photosResult.count || 0,
      followers: followersResult.count || 0,
      likes: likesResult.count || 0,
      streak
    }
  } catch (error) {
    log.error('Failed to get user stats for achievements', {
      component: 'achievement-service',
      action: 'getUserStats',
      userId
    }, error instanceof Error ? error : new Error(String(error)))

    // Return zeros if there's an error
    return {
      albums: 0,
      countries: 0,
      photos: 0,
      followers: 0,
      likes: 0,
      streak: 0
    }
  }
}

/**
 * Calculate current activity streak (consecutive days with album creation)
 */
async function calculateStreak(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  try {
    // Get album creation dates ordered by most recent
    const { data: albums } = await supabase
      .from('albums')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!albums || albums.length === 0) {
      return 0
    }

    // Get unique dates (normalized to day)
    const dates = [...new Set(
      albums.map(a => new Date(a.created_at).toDateString())
    )].map(d => new Date(d))

    // Sort dates descending
    dates.sort((a, b) => b.getTime() - a.getTime())

    // Check if most recent activity was today or yesterday
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mostRecent = dates[0]
    mostRecent.setHours(0, 0, 0, 0)

    const dayDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))

    // If most recent activity is more than 1 day ago, streak is broken
    if (dayDiff > 1) {
      return 0
    }

    // Count consecutive days
    let streak = 1
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1]
      const curr = dates[i]
      prev.setHours(0, 0, 0, 0)
      curr.setHours(0, 0, 0, 0)

      const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  } catch {
    return 0
  }
}

/**
 * Get list of achievement types the user has already earned
 */
export async function getEarnedAchievementTypes(userId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_type')
    .eq('user_id', userId)

  return (data || []).map(a => a.achievement_type)
}

/**
 * Get all earned achievements with full details
 */
export async function getEarnedAchievements(userId: string): Promise<EarnedAchievement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('Failed to get earned achievements', {
      component: 'achievement-service',
      action: 'getEarnedAchievements',
      userId
    }, error)
    return []
  }

  return (data || []).map(a => ({
    id: a.id,
    type: a.achievement_type,
    name: a.achievement_name,
    description: a.description || '',
    icon: a.icon_emoji || '',
    rarity: getAchievementByType(a.achievement_type)?.rarity || 'common',
    earnedAt: a.created_at
  }))
}

/**
 * Award a single achievement to a user
 */
export async function awardAchievement(
  userId: string,
  achievement: AchievementDefinition
): Promise<boolean> {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_type: achievement.type,
        achievement_name: achievement.name,
        description: achievement.description,
        icon_emoji: achievement.icon
      })

    if (error) {
      // If it's a unique constraint violation, the achievement was already awarded
      if (error.code === '23505') {
        log.info('Achievement already awarded', {
          component: 'achievement-service',
          action: 'awardAchievement',
          userId,
          achievementType: achievement.type
        })
        return false
      }

      throw error
    }

    log.userAction('achievement-earned', userId, {
      component: 'achievement-service',
      achievementType: achievement.type,
      achievementName: achievement.name,
      rarity: achievement.rarity
    })

    return true
  } catch (error) {
    log.error('Failed to award achievement', {
      component: 'achievement-service',
      action: 'awardAchievement',
      userId,
      achievementType: achievement.type
    }, error instanceof Error ? error : new Error(String(error)))

    return false
  }
}

/**
 * Check all achievements and award any newly earned ones
 * Returns list of newly earned achievements
 */
export async function checkAndAwardAchievements(userId: string): Promise<NewlyEarnedAchievement[]> {
  try {
    // Get current stats and already-earned achievements
    const [stats, earnedTypes] = await Promise.all([
      getUserStats(userId),
      getEarnedAchievementTypes(userId)
    ])

    const newlyEarned: NewlyEarnedAchievement[] = []

    // Map check types to stat values
    const statMap: Record<AchievementCheckType, number> = {
      albums: stats.albums,
      countries: stats.countries,
      photos: stats.photos,
      followers: stats.followers,
      likes: stats.likes,
      streak: stats.streak
    }

    // Check each stat category for eligible achievements
    for (const checkType of Object.keys(statMap) as AchievementCheckType[]) {
      const currentValue = statMap[checkType]
      const eligible = getEligibleAchievements(checkType, currentValue, earnedTypes)

      for (const achievement of eligible) {
        const awarded = await awardAchievement(userId, achievement)

        if (awarded) {
          newlyEarned.push({
            id: `new-${achievement.type}-${Date.now()}`,
            type: achievement.type,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            earnedAt: new Date().toISOString(),
            isNew: true
          })
        }
      }
    }

    if (newlyEarned.length > 0) {
      log.info('New achievements awarded', {
        component: 'achievement-service',
        action: 'checkAndAwardAchievements',
        userId,
        count: newlyEarned.length,
        achievements: newlyEarned.map(a => a.type)
      })
    }

    return newlyEarned
  } catch (error) {
    log.error('Failed to check and award achievements', {
      component: 'achievement-service',
      action: 'checkAndAwardAchievements',
      userId
    }, error instanceof Error ? error : new Error(String(error)))

    return []
  }
}

/**
 * Get progress for all achievements
 */
export async function getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
  try {
    const [stats, earnedAchievements] = await Promise.all([
      getUserStats(userId),
      getEarnedAchievements(userId)
    ])

    const earnedTypes = earnedAchievements.map(a => a.type)
    const earnedMap = new Map(earnedAchievements.map(a => [a.type, a]))

    // Map check types to stat values
    const statMap: Record<AchievementCheckType, number> = {
      albums: stats.albums,
      countries: stats.countries,
      photos: stats.photos,
      followers: stats.followers,
      likes: stats.likes,
      streak: stats.streak
    }

    return ACHIEVEMENTS.map(achievement => {
      const currentValue = statMap[achievement.checkType]
      const isEarned = earnedTypes.includes(achievement.type)
      const earned = earnedMap.get(achievement.type)

      // Calculate progress
      let progress: number
      if (isEarned) {
        progress = 100
      } else {
        const progressResult = getProgressToNext(
          achievement.checkType,
          currentValue,
          earnedTypes.filter(t => {
            const def = getAchievementByType(t)
            return def && def.checkType === achievement.checkType && def.threshold < achievement.threshold
          })
        )
        progress = Math.min(Math.round((currentValue / achievement.threshold) * 100), 99)
      }

      return {
        type: achievement.type,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        category: achievement.category,
        threshold: achievement.threshold,
        currentValue,
        progress,
        isEarned,
        earnedAt: earned?.earnedAt
      }
    })
  } catch (error) {
    log.error('Failed to get achievement progress', {
      component: 'achievement-service',
      action: 'getAchievementProgress',
      userId
    }, error instanceof Error ? error : new Error(String(error)))

    return []
  }
}
