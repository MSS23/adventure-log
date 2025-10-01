import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export interface UserLevel {
  current_level: number
  current_title: string
  total_experience: number
  albums_created: number
  countries_visited: number
  photos_uploaded: number
  social_interactions: number
  level_up_date: string
  created_at: string
  updated_at: string
}

export interface LevelInfo {
  current_level: number
  current_title: string
  total_experience: number
  next_level: number
  next_title: string
  experience_to_next: number
  progress_percentage: number
}

export interface LevelRequirement {
  level: number
  title: string
  experience_required: number
  albums_required: number
  countries_required: number
  photos_required: number
  description: string
}

export function useUserLevels() {
  const { user } = useAuth()
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [levelRequirements, setLevelRequirements] = useState<LevelRequirement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch user level data
  const fetchUserLevel = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: levelError } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If table doesn't exist (PGRST204) or no rows (PGRST116), set default
      if (levelError && (levelError.code === 'PGRST204' || levelError.code === 'PGRST116')) {
        // Table doesn't exist or no data - set default level
        setUserLevel({
          current_level: 1,
          current_title: 'Explorer',
          total_experience: 0,
          albums_created: 0,
          countries_visited: 0,
          photos_uploaded: 0,
          social_interactions: 0,
          level_up_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setLoading(false)
        return
      }

      if (levelError) {
        throw levelError
      }

      setUserLevel(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user level'
      setError(errorMessage)
      log.error('Failed to fetch user level', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  // Fetch level info with progress
  const fetchLevelInfo = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error: infoError } = await supabase
        .rpc('get_user_level_info', {
          user_id_param: user.id
        })

      if (infoError) {
        throw infoError
      }

      if (data && data.length > 0) {
        setLevelInfo(data[0])
      }

    } catch (err) {
      log.warn('Failed to fetch level info, using basic data', { error: err })
      // Fallback to basic level data if RPC function doesn't exist
      if (userLevel) {
        setLevelInfo({
          current_level: userLevel.current_level,
          current_title: userLevel.current_title,
          total_experience: userLevel.total_experience,
          next_level: userLevel.current_level + 1,
          next_title: 'Next Level',
          experience_to_next: 100,
          progress_percentage: 0
        })
      }
    }
  }, [user?.id, userLevel, supabase])

  // Fetch level requirements
  const fetchLevelRequirements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('level_requirements')
        .select('*')
        .order('level', { ascending: true })

      if (error) {
        throw error
      }

      setLevelRequirements(data || [])

    } catch (err) {
      log.warn('Failed to fetch level requirements', { error: err })
      // Set default level requirements if table doesn't exist
      setLevelRequirements([
        {
          level: 1,
          title: 'Explorer',
          experience_required: 0,
          albums_required: 0,
          countries_required: 0,
          photos_required: 0,
          description: 'Welcome to your adventure journey!'
        }
      ])
    }
  }, [supabase])

  // Update user level (recalculate and update)
  const updateUserLevel = useCallback(async (): Promise<{
    new_level: number
    new_title: string
    level_up: boolean
  } | null> => {
    if (!user?.id) return null

    try {
      const { data, error } = await supabase
        .rpc('update_user_level', {
          user_id_param: user.id
        })

      if (error) {
        throw error
      }

      // Refresh user level data after update
      await fetchUserLevel()
      await fetchLevelInfo()

      return data?.[0] || null

    } catch (err) {
      log.error('Failed to update user level', { error: err })
      return null
    }
  }, [user?.id, supabase, fetchUserLevel, fetchLevelInfo])

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      fetchUserLevel()
      fetchLevelRequirements()
    }
  }, [user, fetchUserLevel, fetchLevelRequirements])

  // Fetch level info when user level changes
  useEffect(() => {
    if (userLevel && user) {
      fetchLevelInfo()
    }
  }, [userLevel, user, fetchLevelInfo])

  // Get level badge color
  const getLevelBadgeColor = (level: number): string => {
    if (level >= 10) return 'bg-gradient-to-r from-purple-500 to-pink-500'
    if (level >= 8) return 'bg-gradient-to-r from-blue-500 to-purple-500'
    if (level >= 6) return 'bg-gradient-to-r from-green-500 to-blue-500'
    if (level >= 4) return 'bg-gradient-to-r from-yellow-500 to-green-500'
    if (level >= 2) return 'bg-gradient-to-r from-orange-500 to-yellow-500'
    return 'bg-gradient-to-r from-gray-400 to-gray-500'
  }

  // Get next level requirement
  const getNextLevelRequirement = (currentLevel: number): LevelRequirement | null => {
    return levelRequirements.find(req => req.level === currentLevel + 1) || null
  }

  // Check if user can level up
  const canLevelUp = (): boolean => {
    if (!userLevel || !levelRequirements.length) return false

    const nextReq = getNextLevelRequirement(userLevel.current_level)
    if (!nextReq) return false

    return (
      userLevel.total_experience >= nextReq.experience_required &&
      userLevel.albums_created >= nextReq.albums_required &&
      userLevel.countries_visited >= nextReq.countries_required &&
      userLevel.photos_uploaded >= nextReq.photos_required
    )
  }

  // Format experience with proper number formatting
  const formatExperience = (exp: number): string => {
    return new Intl.NumberFormat().format(exp)
  }

  // Get achievement status for a level
  const getAchievementStatus = (requirement: LevelRequirement) => {
    if (!userLevel) return { met: false, progress: 0 }

    const albumsMet = userLevel.albums_created >= requirement.albums_required
    const countriesMet = userLevel.countries_visited >= requirement.countries_required
    const photosMet = userLevel.photos_uploaded >= requirement.photos_required
    const expMet = userLevel.total_experience >= requirement.experience_required

    const met = albumsMet && countriesMet && photosMet && expMet

    // Calculate overall progress percentage
    const albumsProgress = Math.min(userLevel.albums_created / Math.max(requirement.albums_required, 1), 1)
    const countriesProgress = Math.min(userLevel.countries_visited / Math.max(requirement.countries_required, 1), 1)
    const photosProgress = Math.min(userLevel.photos_uploaded / Math.max(requirement.photos_required, 1), 1)
    const expProgress = Math.min(userLevel.total_experience / Math.max(requirement.experience_required, 1), 1)

    const progress = Math.round(((albumsProgress + countriesProgress + photosProgress + expProgress) / 4) * 100)

    return {
      met,
      progress,
      requirements: {
        albums: { current: userLevel.albums_created, required: requirement.albums_required, met: albumsMet },
        countries: { current: userLevel.countries_visited, required: requirement.countries_required, met: countriesMet },
        photos: { current: userLevel.photos_uploaded, required: requirement.photos_required, met: photosMet },
        experience: { current: userLevel.total_experience, required: requirement.experience_required, met: expMet }
      }
    }
  }

  return {
    // Data
    userLevel,
    levelInfo,
    levelRequirements,
    loading,
    error,

    // Actions
    fetchUserLevel,
    fetchLevelInfo,
    updateUserLevel,

    // Utilities
    getLevelBadgeColor,
    getNextLevelRequirement,
    canLevelUp,
    formatExperience,
    getAchievementStatus,

    // Computed values
    currentLevel: userLevel?.current_level || 1,
    currentTitle: userLevel?.current_title || 'Explorer',
    totalExperience: userLevel?.total_experience || 0,
    nextLevelReq: levelRequirements.find(req => req.level === (userLevel?.current_level || 1) + 1),
    progressToNext: levelInfo?.progress_percentage || 0
  }
}