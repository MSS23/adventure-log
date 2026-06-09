'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface UserWithStats extends User {
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

        // Fetch users with their stats
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('privacy_level', 'public')
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

        // Batch fetch all stats in 3 queries instead of 3*N queries
        const [albumsResult, photosResult, followersResult] = await Promise.all([
          supabase
            .from('albums')
            .select('user_id, country_code')
            .in('user_id', userIds),
          supabase
            .from('photos')
            .select('user_id')
            .in('user_id', userIds),
          supabase
            .from('follows')
            .select('following_id')
            .in('following_id', userIds)
            .eq('status', 'accepted')
        ])

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

        // Count photos per user
        const photoCounts = new Map<string, number>()
        photosResult.data?.forEach(photo => {
          photoCounts.set(photo.user_id, (photoCounts.get(photo.user_id) || 0) + 1)
        })

        // Count followers per user
        const followerCounts = new Map<string, number>()
        followersResult.data?.forEach(follow => {
          followerCounts.set(follow.following_id, (followerCounts.get(follow.following_id) || 0) + 1)
        })

        // Combine data
        const usersWithStats = usersData.map(user => {
          const albums_count = albumCounts.get(user.id) || 0
          const countries_count = countrySets.get(user.id)?.size || 0
          const photos_count = photoCounts.get(user.id) || 0
          const followers_count = followerCounts.get(user.id) || 0

          // Calculate score (weighted formula)
          const score =
            (albums_count * 10) +
            (countries_count * 15) +
            (photos_count * 2) +
            (followers_count * 5)

          return {
            ...user,
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
        return 'Points'
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2.5", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[color:var(--color-line-warm)] p-4 animate-pulse"
            style={{ background: 'var(--card)' }}
          >
            <div className="w-9 h-9 rounded-full" style={{ background: 'var(--color-ivory-alt)' }} />
            <div className="h-12 w-12 rounded-full" style={{ background: 'var(--color-ivory-alt)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded w-1/3" style={{ background: 'var(--color-ivory-alt)' }} />
              <div className="h-3 rounded w-1/4" style={{ background: 'var(--color-ivory-alt)' }} />
            </div>
            <div className="h-6 w-16 rounded-full" style={{ background: 'var(--color-ivory-alt)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <TrendingUp className="h-8 w-8 text-[color:var(--color-muted-warm)] mb-2" />
        <p className="text-sm text-[color:var(--color-ink-soft)]">{error}</p>
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-14 px-6 rounded-2xl border border-[color:var(--color-line-warm)] text-center"
        style={{ background: 'var(--card)' }}
      >
        <div
          className="w-14 h-14 flex items-center justify-center rounded-2xl mb-4"
          style={{ background: 'var(--color-gold-tint)' }}
        >
          <Trophy className="h-7 w-7" style={{ color: 'var(--color-gold)' }} strokeWidth={1.8} />
        </div>
        <h4 className="font-heading text-lg font-semibold text-[color:var(--color-ink)] mb-1">
          No rankings yet
        </h4>
        <p className="text-sm text-[color:var(--color-ink-soft)] mb-5 max-w-xs">
          Log albums, visit countries, and grow your following to climb the board.
        </p>
        <Link
          href="/albums/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-shadow hover:shadow-[0_10px_28px_rgba(226,85,58,0.45)]"
          style={{ background: 'var(--color-coral)', color: '#fff' }}
        >
          Start your first album
        </Link>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2.5", className)}>
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
            className="group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(26,20,14,0.18)]"
            style={{
              background: 'var(--card)',
              // Top-3 carry a hairline accent border; the rest use the warm line.
              border: `1px solid ${isTopThree ? accent.accent : 'var(--color-line-warm)'}`,
            }}
          >
            {/* Rank badge */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm flex-shrink-0"
              style={
                isTopThree
                  ? { background: accent.tint, color: accent.accent }
                  : { background: 'var(--color-ivory-alt)', color: 'var(--color-muted-warm)' }
              }
            >
              {RankIcon ? (
                <RankIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : (
                <span className="font-mono">{rank}</span>
              )}
            </div>

            {/* Avatar — keep avatar URL logic unchanged */}
            <Avatar
              className="h-12 w-12 ring-2 transition-all duration-200 flex-shrink-0"
              style={{ '--tw-ring-color': isTopThree ? accent.accent : 'var(--color-line-warm)' } as React.CSSProperties}
            >
              <AvatarImage
                src={getAvatarUrl(leader.avatar_url, leader.username)}
                alt={leader.display_name || leader.username}
              />
              <AvatarFallback
                className="font-bold"
                style={{ background: 'var(--color-forest-tint)', color: 'var(--color-forest)' }}
              >
                {(leader.display_name || leader.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-[color:var(--color-ink)] group-hover:text-[color:var(--color-forest)] transition-colors truncate">
                {leader.display_name || leader.username}
              </h3>
              <p className="font-mono text-[11px] tracking-[0.04em] text-[color:var(--color-muted-warm)] truncate">
                @{leader.username}
              </p>
            </div>

            {/* Metric Value */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span
                className="text-lg font-bold tabular-nums"
                style={{ color: isTopThree ? accent.accent : 'var(--color-ink)' }}
              >
                {metricValue.toLocaleString()}
              </span>
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[color:var(--color-muted-warm)]">
                {getMetricLabel()}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
