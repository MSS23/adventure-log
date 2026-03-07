/**
 * Achievement Definitions
 *
 * Central catalog of all achievements with their thresholds,
 * rarities, and metadata.
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'journey' | 'countries' | 'photos' | 'social' | 'streaks'
export type AchievementCheckType = 'albums' | 'countries' | 'photos' | 'followers' | 'likes' | 'streak'

export interface AchievementDefinition {
  type: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  threshold: number
  checkType: AchievementCheckType
}

/**
 * All achievement definitions organized by category
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ==========================================
  // JOURNEY ACHIEVEMENTS (Album-based)
  // ==========================================
  {
    type: 'first_album',
    name: 'First Steps',
    description: 'Create your first album',
    icon: '🎒',
    rarity: 'common',
    category: 'journey',
    threshold: 1,
    checkType: 'albums'
  },
  {
    type: 'albums_5',
    name: 'Adventure Seeker',
    description: 'Create 5 albums',
    icon: '🗺️',
    rarity: 'common',
    category: 'journey',
    threshold: 5,
    checkType: 'albums'
  },
  {
    type: 'albums_10',
    name: 'Seasoned Traveler',
    description: 'Create 10 albums',
    icon: '✈️',
    rarity: 'rare',
    category: 'journey',
    threshold: 10,
    checkType: 'albums'
  },
  {
    type: 'albums_25',
    name: 'Globe Trotter',
    description: 'Create 25 albums',
    icon: '🌍',
    rarity: 'epic',
    category: 'journey',
    threshold: 25,
    checkType: 'albums'
  },
  {
    type: 'albums_50',
    name: 'World Explorer',
    description: 'Create 50 albums',
    icon: '🏆',
    rarity: 'legendary',
    category: 'journey',
    threshold: 50,
    checkType: 'albums'
  },

  // ==========================================
  // COUNTRY ACHIEVEMENTS
  // ==========================================
  {
    type: 'countries_3',
    name: 'Border Crosser',
    description: 'Visit 3 countries',
    icon: '🛂',
    rarity: 'common',
    category: 'countries',
    threshold: 3,
    checkType: 'countries'
  },
  {
    type: 'countries_5',
    name: 'Passport Collector',
    description: 'Visit 5 countries',
    icon: '📕',
    rarity: 'common',
    category: 'countries',
    threshold: 5,
    checkType: 'countries'
  },
  {
    type: 'countries_10',
    name: 'Continental Explorer',
    description: 'Visit 10 countries',
    icon: '🌎',
    rarity: 'rare',
    category: 'countries',
    threshold: 10,
    checkType: 'countries'
  },
  {
    type: 'countries_25',
    name: 'World Wanderer',
    description: 'Visit 25 countries',
    icon: '🧭',
    rarity: 'epic',
    category: 'countries',
    threshold: 25,
    checkType: 'countries'
  },
  {
    type: 'countries_50',
    name: 'Global Citizen',
    description: 'Visit 50 countries',
    icon: '👑',
    rarity: 'legendary',
    category: 'countries',
    threshold: 50,
    checkType: 'countries'
  },

  // ==========================================
  // PHOTOGRAPHY ACHIEVEMENTS
  // ==========================================
  {
    type: 'photos_10',
    name: 'Shutterbug',
    description: 'Upload 10 photos',
    icon: '📷',
    rarity: 'common',
    category: 'photos',
    threshold: 10,
    checkType: 'photos'
  },
  {
    type: 'photos_50',
    name: 'Photographer',
    description: 'Upload 50 photos',
    icon: '📸',
    rarity: 'common',
    category: 'photos',
    threshold: 50,
    checkType: 'photos'
  },
  {
    type: 'photos_100',
    name: 'Photo Enthusiast',
    description: 'Upload 100 photos',
    icon: '🎞️',
    rarity: 'rare',
    category: 'photos',
    threshold: 100,
    checkType: 'photos'
  },
  {
    type: 'photos_500',
    name: 'Visual Storyteller',
    description: 'Upload 500 photos',
    icon: '🖼️',
    rarity: 'epic',
    category: 'photos',
    threshold: 500,
    checkType: 'photos'
  },
  {
    type: 'photos_1000',
    name: 'Master Photographer',
    description: 'Upload 1000 photos',
    icon: '🏅',
    rarity: 'legendary',
    category: 'photos',
    threshold: 1000,
    checkType: 'photos'
  },

  // ==========================================
  // SOCIAL ACHIEVEMENTS - Followers
  // ==========================================
  {
    type: 'followers_5',
    name: 'Making Friends',
    description: 'Gain 5 followers',
    icon: '👋',
    rarity: 'common',
    category: 'social',
    threshold: 5,
    checkType: 'followers'
  },
  {
    type: 'followers_25',
    name: 'Popular Traveler',
    description: 'Gain 25 followers',
    icon: '⭐',
    rarity: 'rare',
    category: 'social',
    threshold: 25,
    checkType: 'followers'
  },
  {
    type: 'followers_100',
    name: 'Travel Influencer',
    description: 'Gain 100 followers',
    icon: '🌟',
    rarity: 'epic',
    category: 'social',
    threshold: 100,
    checkType: 'followers'
  },

  // ==========================================
  // SOCIAL ACHIEVEMENTS - Likes
  // ==========================================
  {
    type: 'likes_10',
    name: 'Getting Noticed',
    description: 'Receive 10 likes',
    icon: '❤️',
    rarity: 'common',
    category: 'social',
    threshold: 10,
    checkType: 'likes'
  },
  {
    type: 'likes_50',
    name: 'Fan Favorite',
    description: 'Receive 50 likes',
    icon: '💖',
    rarity: 'rare',
    category: 'social',
    threshold: 50,
    checkType: 'likes'
  },
  {
    type: 'likes_100',
    name: 'Crowd Pleaser',
    description: 'Receive 100 likes',
    icon: '💝',
    rarity: 'epic',
    category: 'social',
    threshold: 100,
    checkType: 'likes'
  },

  // ==========================================
  // STREAK ACHIEVEMENTS
  // ==========================================
  {
    type: 'streak_3',
    name: 'Getting Started',
    description: '3-day activity streak',
    icon: '🔥',
    rarity: 'common',
    category: 'streaks',
    threshold: 3,
    checkType: 'streak'
  },
  {
    type: 'streak_7',
    name: 'Week Warrior',
    description: '7-day activity streak',
    icon: '🔥',
    rarity: 'rare',
    category: 'streaks',
    threshold: 7,
    checkType: 'streak'
  },
  {
    type: 'streak_30',
    name: 'Monthly Master',
    description: '30-day activity streak',
    icon: '💪',
    rarity: 'epic',
    category: 'streaks',
    threshold: 30,
    checkType: 'streak'
  },
  {
    type: 'streak_100',
    name: 'Legendary Dedication',
    description: '100-day activity streak',
    icon: '🏆',
    rarity: 'legendary',
    category: 'streaks',
    threshold: 100,
    checkType: 'streak'
  }
]

/**
 * Get all achievements in a specific category
 */
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * Get a specific achievement by its type
 */
export function getAchievementByType(type: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.type === type)
}

/**
 * Get all achievements for a specific check type
 */
export function getAchievementsByCheckType(checkType: AchievementCheckType): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.checkType === checkType)
}

/**
 * Get achievements sorted by threshold (ascending) for a check type
 */
export function getAchievementTiers(checkType: AchievementCheckType): AchievementDefinition[] {
  return getAchievementsByCheckType(checkType).sort((a, b) => a.threshold - b.threshold)
}

/**
 * Get the next unearned achievement for a stat value
 */
export function getNextAchievement(
  checkType: AchievementCheckType,
  currentValue: number,
  earnedTypes: string[]
): AchievementDefinition | null {
  const tiers = getAchievementTiers(checkType)

  for (const achievement of tiers) {
    if (!earnedTypes.includes(achievement.type) && currentValue < achievement.threshold) {
      return achievement
    }
  }

  return null
}

/**
 * Get all achievements that should be awarded for a stat value
 */
export function getEligibleAchievements(
  checkType: AchievementCheckType,
  currentValue: number,
  earnedTypes: string[]
): AchievementDefinition[] {
  return getAchievementsByCheckType(checkType).filter(
    a => currentValue >= a.threshold && !earnedTypes.includes(a.type)
  )
}

/**
 * Calculate progress percentage toward next achievement
 */
export function getProgressToNext(
  checkType: AchievementCheckType,
  currentValue: number,
  earnedTypes: string[]
): { progress: number; next: AchievementDefinition | null } {
  const next = getNextAchievement(checkType, currentValue, earnedTypes)

  if (!next) {
    return { progress: 100, next: null }
  }

  // Find the previous tier's threshold (or 0 if this is the first)
  const tiers = getAchievementTiers(checkType)
  const nextIndex = tiers.findIndex(a => a.type === next.type)
  const previousThreshold = nextIndex > 0 ? tiers[nextIndex - 1].threshold : 0

  const range = next.threshold - previousThreshold
  const current = currentValue - previousThreshold
  const progress = Math.min(Math.round((current / range) * 100), 99)

  return { progress, next }
}

/**
 * Group achievements by category with counts
 */
export function getAchievementSummary(): Record<AchievementCategory, {
  total: number
  byRarity: Record<AchievementRarity, number>
}> {
  const categories: AchievementCategory[] = ['journey', 'countries', 'photos', 'social', 'streaks']
  const rarities: AchievementRarity[] = ['common', 'rare', 'epic', 'legendary']

  const summary: Record<AchievementCategory, { total: number; byRarity: Record<AchievementRarity, number> }> = {} as never

  for (const category of categories) {
    const categoryAchievements = getAchievementsByCategory(category)
    summary[category] = {
      total: categoryAchievements.length,
      byRarity: rarities.reduce((acc, rarity) => {
        acc[rarity] = categoryAchievements.filter(a => a.rarity === rarity).length
        return acc
      }, {} as Record<AchievementRarity, number>)
    }
  }

  return summary
}
