'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Award, Star, Globe, Camera, Users, Check, CalendarDays } from 'lucide-react'
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
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
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
    <section className={cn("space-y-3", className)} aria-labelledby="earned-badges-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p id="earned-badges-heading" className="al-eyebrow">Earned badges</p>
          <p className="mt-1 text-xs text-muted-foreground">Milestones from your travel story.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-primary">
          {achievements.length} earned
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {achievements.map((achievement) => {
          const IconComponent = ACHIEVEMENT_ICONS[achievement.achievement_type] || ACHIEVEMENT_ICONS.default
          const gradientColor = ACHIEVEMENT_COLORS[achievement.achievement_type] || ACHIEVEMENT_COLORS.default
          const earnedDate = new Date(achievement.created_at).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric'
          })

          return (
            <article
              key={achievement.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-resting)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-70" />
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-current/10",
                  gradientColor
                )}>
                  <IconComponent className="h-6 w-6" aria-hidden />
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {achievement.achievement_name}
                  </h3>
                  {achievement.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {achievement.description}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground">
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    Earned {earnedDate}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
