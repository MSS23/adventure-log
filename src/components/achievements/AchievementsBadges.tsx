'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Award, Star, Globe, Camera, Users } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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
  globe_trotter: 'bg-primary/10 text-primary',
  photographer: 'bg-primary/10 text-primary',
  travel_enthusiast: 'bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)]',
  explorer: 'bg-accent/10 text-accent',
  social_butterfly: 'bg-accent/10 text-accent',
  default: 'bg-muted text-muted-foreground'
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
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 mx-auto w-3/4" />
                <Skeleton className="h-3 mx-auto w-full" />
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
        <Trophy className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="h-6 w-6" />
        </div>
        <p className="font-heading font-semibold text-foreground mb-1">No achievements yet</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
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
            className="rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/30"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Icon */}
              <div className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full",
                gradientColor
              )}>
                {achievement.icon_emoji ? (
                  <span className="text-2xl">{achievement.icon_emoji}</span>
                ) : (
                  <IconComponent className="h-8 w-8" />
                )}
              </div>

              {/* Achievement Info */}
              <div className="space-y-1 w-full">
                <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">
                  {achievement.achievement_name}
                </h3>
                {achievement.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {achievement.description}
                  </p>
                )}
                <p className="font-mono text-xs tracking-wide text-muted-foreground pt-1 border-t border-border">
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
