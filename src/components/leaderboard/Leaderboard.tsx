'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'

interface UserWithStats extends Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> {
  albums_count: number
  countries_count: number
  photos_count: number
  followers_count: number
  score: number
}

interface LeaderboardProps {
  className?: string
  limit?: number
  metric?: 'albums' | 'countries' | 'photos' | 'followers' | 'score'
}

// Top-3 accents use Field Notebook tokens: gold (1st), forest (2nd), coral (3rd).
// `accent` drives the icon + metric color; `ring`/`tint` are applied via inline
// CSS vars so they track light/dark automatically.
const RANK_ACCENTS = {
  1: { icon: Trophy, accent: 'var(--color-gold)', tint: 'var(--color-gold-tint)' },
  2: { icon: Medal, accent: 'var(--color-forest)', tint: 'var(--color-forest-tint)' },
  3: { icon: Award, accent: 'var(--color-coral)', tint: 'var(--color-coral-tint)' },
} as const

export function Leaderboard({ className, limit = 10, metric = 'score' }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<UserWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      const supabase = createClient()

      try {
        setIsLoading(true)
        setError(null)

        // Fetch users with photo/follower counts embedded (counted in the DB,
        // not by pulling every row client-side)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, photos(count), followers:follows!following_id(count)')
          .eq('privacy_level', 'public')
          .eq('followers.status', 'accepted')
          .limit(50) // Get more users to calculate stats

        if (usersError) {
          log.error('Error fetching users for leaderboard', {
            component: 'Leaderboard',
            action: 'fetchLeaderboard'
          }, usersError)
          setError('Failed to load leaderboard')
          return
        }

        if (!usersData || usersData.length === 0) {
          setLeaders([])
          return
        }

        const userIds = usersData.map(u => u.id)

        // Albums still need row data for the distinct-country count
        const albumsResult = await supabase
          .from('albums')
          .select('user_id, country_code')
          .in('user_id', userIds)

        // Count albums and unique countries per user
        const albumCounts = new Map<string, number>()
        const countrySets = new Map<string, Set<string>>()
        albumsResult.data?.forEach(album => {
          albumCounts.set(album.user_id, (albumCounts.get(album.user_id) || 0) + 1)
          if (album.country_code) {
            if (!countrySets.has(album.user_id)) {
              countrySets.set(album.user_id, new Set())
            }
            countrySets.get(album.user_id)!.add(album.country_code)
          }
        })

        // Combine data (photo/follower counts come from the embedded aggregates)
        const usersWithStats = usersData.map(user => {
          const { photos, followers, ...rest } = user
          const albums_count = albumCounts.get(user.id) || 0
          const countries_count = countrySets.get(user.id)?.size || 0
          const photos_count = photos?.[0]?.count ?? 0
          const followers_count = followers?.[0]?.count ?? 0

          // Calculate score (weighted formula)
          const score =
            (albums_count * 10) +
            (countries_count * 15) +
            (photos_count * 2) +
            (followers_count * 5)

          return {
            ...rest,
            albums_count,
            countries_count,
            photos_count,
            followers_count,
            score
          }
        })

        // Sort by selected metric
        let sorted: UserWithStats[] = []
        switch (metric) {
          case 'albums':
            sorted = usersWithStats.sort((a, b) => b.albums_count - a.albums_count)
            break
          case 'countries':
            sorted = usersWithStats.sort((a, b) => b.countries_count - a.countries_count)
            break
          case 'photos':
            sorted = usersWithStats.sort((a, b) => b.photos_count - a.photos_count)
            break
          case 'followers':
            sorted = usersWithStats.sort((a, b) => b.followers_count - a.followers_count)
            break
          default: // score
            sorted = usersWithStats.sort((a, b) => b.score - a.score)
        }

        setLeaders(sorted.slice(0, limit))
      } catch (err) {
        log.error('Error in fetchLeaderboard', {
          component: 'Leaderboard',
          action: 'fetchLeaderboard'
        }, err as Error)
        setError('Failed to load leaderboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit, metric])

  const getMetricValue = (user: UserWithStats): number => {
    switch (metric) {
      case 'albums':
        return user.albums_count
      case 'countries':
        return user.countries_count
      case 'photos':
        return user.photos_count
      case 'followers':
        return user.followers_count
      default:
        return user.score
    }
  }

  const getMetricLabel = (): string => {
    switch (metric) {
      case 'albums':
        return 'Albums'
      case 'countries':
        return 'Countries'
      case 'photos':
        return 'Photos'
      case 'followers':
        return 'Followers'
      default:
        return 'Score'
    }
  }

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-2 space-y-1", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-gold)]/15 mb-4">
          <Trophy className="h-6 w-6" style={{ color: 'var(--color-gold)' }} strokeWidth={1.8} />
        </div>
        <h4 className="font-heading text-lg font-semibold text-foreground">
          No rankings yet
        </h4>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Log albums, visit countries, and grow your following to climb the board.
        </p>
        <Button asChild className="mt-5">
          <Link href="/albums/new">Start your first album</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-2 space-y-1", className)}>
      {leaders.map((leader, index) => {
        const rank = index + 1
        const accent = RANK_ACCENTS[rank as keyof typeof RANK_ACCENTS]
        const metricValue = getMetricValue(leader)
        const RankIcon = accent?.icon
        const isTopThree = !!accent

        return (
          <Link
            key={leader.id}
            href={`/profile/${leader.username}`}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Rank badge */}
            <div
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0",
                !isTopThree && "bg-muted text-muted-foreground"
              )}
              style={isTopThree ? { background: accent.tint, color: accent.accent } : undefined}
            >
              {RankIcon ? (
                <RankIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : (
                <span className="font-mono">{rank}</span>
              )}
            </div>

            {/* Avatar — keep avatar URL logic unchanged */}
            <Avatar
              className={cn(
                "h-11 w-11 flex-shrink-0",
                isTopThree ? "ring-2" : "ring-1 ring-border"
              )}
              style={isTopThree ? ({ '--tw-ring-color': accent.accent } as React.CSSProperties) : undefined}
            >
              <AvatarImage
                src={getAvatarUrl(leader.avatar_url, leader.username)}
                alt={getDisplayName(leader.display_name, leader.username)}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getDisplayInitial(leader.display_name, leader.username)}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {getDisplayName(leader.display_name, leader.username)}
              </h3>
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground truncate">
                @{leader.username}
              </p>
            </div>

            {/* Metric Value */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span
                className={cn("text-lg font-semibold tabular-nums", !isTopThree && "text-foreground")}
                style={isTopThree ? { color: accent.accent } : undefined}
              >
                {metricValue.toLocaleString()}
              </span>
              <span className="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">
                {getMetricLabel()}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
