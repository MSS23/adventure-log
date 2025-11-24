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

const RANK_ICONS = {
  1: { icon: Trophy, color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  2: { icon: Medal, color: 'text-gray-400', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  3: { icon: Award, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
}

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

        // Fetch stats for each user
        const usersWithStats = await Promise.all(
          usersData.map(async (user) => {
            const [albumsResult, photosResult, followersResult] = await Promise.all([
              supabase
                .from('albums')
                .select('id, country_code', { count: 'exact' })
                .eq('user_id', user.id),
              supabase
                .from('photos')
                .select('id', { count: 'exact' })
                .eq('user_id', user.id),
              supabase
                .from('follows')
                .select('id', { count: 'exact' })
                .eq('following_id', user.id)
                .eq('status', 'accepted')
            ])

            const albums_count = albumsResult.count || 0
            const photos_count = photosResult.count || 0
            const followers_count = followersResult.count || 0

            // Calculate unique countries
            const uniqueCountries = new Set(
              (albumsResult.data || [])
                .filter(a => a.country_code)
                .map(a => a.country_code)
            )
            const countries_count = uniqueCountries.size

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
        )

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
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-white rounded-lg border border-gray-100 p-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-12 w-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <TrendingUp className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <Trophy className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium mb-1">No rankings yet</p>
        <p className="text-sm text-gray-500">Be the first to climb the leaderboard!</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {leaders.map((leader, index) => {
        const rank = index + 1
        const rankIcon = RANK_ICONS[rank as keyof typeof RANK_ICONS]
        const metricValue = getMetricValue(leader)
        const RankIcon = rankIcon?.icon

        return (
          <Link
            key={leader.id}
            href={`/profile/${leader.username}`}
            className="group flex items-center gap-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 p-4"
          >
            {/* Rank */}
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
              rankIcon ? rankIcon.bgColor : "bg-gray-50 text-gray-600"
            )}>
              {RankIcon ? (
                <RankIcon className={cn("h-5 w-5", rankIcon.color)} />
              ) : (
                <span>{rank}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className={cn(
              "h-12 w-12 ring-2 group-hover:ring-4 transition-all duration-200",
              rankIcon ? `ring-${rankIcon.borderColor}` : "ring-gray-100 group-hover:ring-teal-200"
            )}>
              <AvatarImage
                src={getAvatarUrl(leader.avatar_url, leader.username)}
                alt={leader.display_name || leader.username}
              />
              <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 font-bold">
                {(leader.display_name || leader.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors truncate">
                {leader.display_name || leader.username}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                @{leader.username}
              </p>
            </div>

            {/* Metric Value */}
            <div className="flex flex-col items-end">
              <span className={cn(
                "text-lg font-bold",
                rankIcon ? rankIcon.color : "text-gray-900"
              )}>
                {metricValue.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">{getMetricLabel()}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
