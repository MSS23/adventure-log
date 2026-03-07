'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Award, Star, Globe, Camera, Users } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

interface Achievement {
  id: string
  achievement_type: string
  achievement_name: string
  description: string | null
  icon_emoji: string | null
  created_at: string
  metadata?: Record<string, unknown>
}

interface AchievementsBadgesProps {
  userId: string
  limit?: number
  showAll?: boolean
  className?: string
}

const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  globe_trotter: Globe,
  photographer: Camera,
  travel_enthusiast: Star,
  explorer: Award,
  social_butterfly: Users,
  default: Trophy
}

const ACHIEVEMENT_COLORS: Record<string, string> = {
  globe_trotter: 'from-blue-500 to-cyan-500',
  photographer: 'from-purple-500 to-pink-500',
  travel_enthusiast: 'from-orange-500 to-yellow-500',
  explorer: 'from-green-500 to-teal-500',
  social_butterfly: 'from-red-500 to-pink-500',
  default: 'from-gray-500 to-gray-600'
}

export function AchievementsBadges({ userId, limit, showAll = false, className }: AchievementsBadgesProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAchievements() {
      const supabase = createClient()

      try {
        setIsLoading(true)
        setError(null)

        let query = supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (limit && !showAll) {
          query = query.limit(limit)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          log.error('Error fetching achievements', {
            component: 'AchievementsBadges',
            action: 'fetchAchievements',
            userId
          }, fetchError)
          setError('Failed to load achievements')
          return
        }

        setAchievements(data || [])
      } catch (err) {
        log.error('Error in fetchAchievements', {
          component: 'AchievementsBadges',
          action: 'fetchAchievements',
          userId
        }, err as Error)
        setError('Failed to load achievements')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAchievements()
  }, [userId, limit, showAll])

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4", className)}>
        {Array.from({ length: limit || 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-200" />
              <div className="space-y-2 w-full">
                <div className="h-4 bg-gray-200 rounded mx-auto w-3/4" />
                <div className="h-3 bg-gray-100 rounded mx-auto w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Trophy className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <Trophy className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium mb-1">No achievements yet</p>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Start exploring and sharing your adventures to earn badges!
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4", className)}>
      {achievements.map((achievement) => {
        const IconComponent = ACHIEVEMENT_ICONS[achievement.achievement_type] || ACHIEVEMENT_ICONS.default
        const gradientColor = ACHIEVEMENT_COLORS[achievement.achievement_type] || ACHIEVEMENT_COLORS.default
        const earnedDate = new Date(achievement.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })

        return (
          <div
            key={achievement.id}
            className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 p-4"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Icon */}
              <div className={cn(
                "relative h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center",
                "ring-4 ring-white shadow-lg group-hover:scale-110 transition-transform duration-300",
                gradientColor
              )}>
                {achievement.icon_emoji ? (
                  <span className="text-2xl">{achievement.icon_emoji}</span>
                ) : (
                  <IconComponent className="h-8 w-8 text-white" />
                )}
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Achievement Info */}
              <div className="space-y-1 w-full">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                  {achievement.achievement_name}
                </h3>
                {achievement.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
                    {achievement.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                  Earned {earnedDate}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
