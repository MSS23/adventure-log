'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Heart, Camera, UserPlus, Trophy, Flame } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { log } from '@/lib/utils/logger'

interface Activity {
  id: string
  type: 'album' | 'like' | 'follow' | 'achievement' | 'milestone'
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  target?: {
    id: string
    title?: string
    location?: string
  }
  metadata?: {
    count?: number
    achievement_name?: string
  }
  created_at: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()

    // Refresh every 30 seconds for "live" feel, but only when page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchActivities()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchActivities() {
    const supabase = createClient()

    try {
      setError(null)
      // Get recent albums (last 24 hours)
      const { data: albums } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          location_name,
          created_at,
          user_id,
          users!albums_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      const albumActivities: Activity[] = (albums || []).map(album => {
        // Handle users being either an object or array
        const user = Array.isArray(album.users) ? album.users[0] : album.users

        return {
          id: `album-${album.id}`,
          type: 'album' as const,
          user: {
            id: user?.id || album.user_id,
            username: user?.username || 'user',
            display_name: user?.display_name || null,
            avatar_url: user?.avatar_url || null
          },
          target: {
            id: album.id,
            title: album.title,
            location: album.location_name || undefined
          },
          created_at: album.created_at
        }
      })

      setActivities(albumActivities)
    } catch (error) {
      log.error('Error fetching activities', { component: 'ActivityFeed', action: 'fetch-activities' }, error as Error)
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'album':
        return <Camera className="h-4 w-4 text-olive-600" />
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-olive-600" />
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-600" />
      case 'milestone':
        return <Flame className="h-4 w-4 text-olive-600" />
    }
  }

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'album':
        return (
          <>
            <span className="font-semibold">{activity.user.display_name || activity.user.username}</span>
            {' visited '}
            <span className="font-semibold text-olive-600">{activity.target?.location || activity.target?.title}</span>
          </>
        )
      case 'like':
        return (
          <>
            <span className="font-semibold">{activity.user.display_name || activity.user.username}</span>
            {' loved an album'}
          </>
        )
      case 'follow':
        return (
          <>
            <span className="font-semibold">{activity.user.display_name || activity.user.username}</span>
            {' started following someone'}
          </>
        )
      case 'achievement':
        return (
          <>
            <span className="font-semibold">{activity.user.display_name || activity.user.username}</span>
            {' unlocked '}
            <span className="font-semibold text-yellow-600">{activity.metadata?.achievement_name}</span>
          </>
        )
      case 'milestone':
        return (
          <>
            <span className="font-semibold">{activity.user.display_name || activity.user.username}</span>
            {' reached '}
            <span className="font-semibold text-olive-600">{activity.metadata?.count} countries!</span>
          </>
        )
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-olive-500 animate-pulse" />
          <h3 className="font-semibold text-stone-900">Live Activity</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-stone-200" />
              <div className="flex-1">
                <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-stone-400" />
          <h3 className="font-semibold text-stone-900">Live Activity</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-stone-500 mb-3">{error}</p>
          <button
            onClick={() => fetchActivities()}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-olive-500" />
        <h3 className="font-semibold text-stone-900">Live Activity</h3>
        <span className="ml-auto text-xs text-stone-500">Last 24h</span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">No recent activity</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 group">
              <Link href={`/profile/${activity.user.username}`}>
                <Avatar className="h-8 w-8 ring-2 ring-stone-100 group-hover:ring-olive-100 transition-all duration-200">
                  <AvatarImage src={activity.user.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-olive-100 to-olive-100 text-olive-700 text-xs">
                    {(activity.user.display_name || activity.user.username)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {getActivityText(activity)}
                  </p>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>

              {activity.target && activity.type === 'album' && (
                <Link
                  href={`/albums/${activity.target.id}`}
                  className="text-xs text-olive-600 hover:text-olive-700 font-medium whitespace-nowrap"
                >
                  View →
                </Link>
              )}
            </div>
          ))
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <Link
            href="/feed"
            className="text-sm text-olive-600 hover:text-olive-700 font-medium flex items-center justify-center gap-1 transition-colors duration-200"
          >
            See all activity →
          </Link>
        </div>
      )}
    </div>
  )
}
