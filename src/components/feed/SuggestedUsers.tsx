'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  album_count?: number
  follower_count?: number
}

export function SuggestedUsers() {
  const { user } = useAuth()
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers()
      fetchFollowingStatus()
    }
  }, [user])

  async function fetchFollowingStatus() {
    if (!user) return

    try {
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id, status')
        .eq('follower_id', user.id)

      // Ignore 406 errors (no relationships found) - this is expected for new users
      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (follows && follows.length > 0) {
        const accepted = new Set(
          follows.filter(f => f.status === 'accepted').map(f => f.following_id)
        )
        const pending = new Set(
          follows.filter(f => f.status === 'pending').map(f => f.following_id)
        )
        setFollowingIds(accepted)
        setPendingFollows(pending)
      }
    } catch (error) {
      log.error('Error fetching following status', { component: 'SuggestedUsers', action: 'fetchFollowingStatus' }, error as Error)
    }
  }

  async function fetchSuggestedUsers() {
    if (!user) return

    try {
      // Get users the current user is NOT following
      const { data: currentFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = currentFollows?.map(f => f.following_id) || []

      // Fetch users with albums (excluding current user and already followed users)
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          privacy_level
        `)
        .neq('id', user.id)
        .not('id', 'in', `(${followingIds.join(',') || 'null'})`)
        .eq('privacy_level', 'public')
        .limit(5)

      if (error) throw error

      // Get album counts for each user
      const usersWithCounts = await Promise.all(
        (users || []).map(async (u) => {
          const { count: albumCount } = await supabase
            .from('albums')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', u.id)

          const { count: followerCount } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', u.id)
            .eq('status', 'accepted')

          return {
            ...u,
            album_count: albumCount || 0,
            follower_count: followerCount || 0
          }
        })
      )

      // Sort by album count (most active users first)
      const sortedUsers = usersWithCounts
        .filter(u => u.album_count && u.album_count > 0)
        .sort((a, b) => (b.album_count || 0) - (a.album_count || 0))

      setSuggestedUsers(sortedUsers)
    } catch (error) {
      log.error('Error fetching suggested users', { component: 'SuggestedUsers', action: 'fetchSuggestedUsers' }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow(userId: string) {
    if (!user) return

    try {
      setPendingFollows(prev => new Set([...prev, userId]))

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
          status: 'pending'
        })

      if (error) throw error

      log.info('Follow request sent', {
        component: 'SuggestedUsers',
        action: 'follow',
        followerId: user.id,
        followingId: userId
      })
    } catch (error) {
      log.error('Error following user', { component: 'SuggestedUsers', action: 'follow' }, error as Error)
      setPendingFollows(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-teal-600 animate-pulse" />
          <h3 className="font-semibold text-gray-900">Suggested for you</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (suggestedUsers.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-teal-600" />
        <h3 className="font-semibold text-gray-900">Suggested for you</h3>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {suggestedUsers.map(suggestedUser => {
          const isFollowing = followingIds.has(suggestedUser.id)
          const isPending = pendingFollows.has(suggestedUser.id)

          return (
            <div key={suggestedUser.id} className="flex items-center justify-center gap-3 group">
              <Link href={`/profile/${suggestedUser.username}`}>
                <Avatar className="h-10 w-10 ring-2 ring-gray-100 group-hover:ring-teal-100 transition-all duration-200">
                  <AvatarImage src={getAvatarUrl(suggestedUser.avatar_url, suggestedUser.username)} />
                  <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-sm">
                    {(suggestedUser.display_name || suggestedUser.username)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${suggestedUser.username}`}
                  className="block hover:underline"
                >
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {suggestedUser.display_name || suggestedUser.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    @{suggestedUser.username}
                  </p>
                </Link>
                <p className="text-xs text-gray-600 mt-1">
                  {suggestedUser.album_count || 0} {suggestedUser.album_count === 1 ? 'album' : 'albums'}
                  {suggestedUser.follower_count ? ` • ${suggestedUser.follower_count} ${suggestedUser.follower_count === 1 ? 'follower' : 'followers'}` : ''}
                </p>
              </div>

              <Button
                size="sm"
                variant={isFollowing ? 'outline' : isPending ? 'outline' : 'default'}
                onClick={() => handleFollow(suggestedUser.id)}
                disabled={isFollowing || isPending}
                className="flex-shrink-0"
              >
                {isFollowing ? (
                  'Following'
                ) : isPending ? (
                  'Pending'
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          )
        })}
      </div>

      {suggestedUsers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href="/search?tab=users"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1 transition-colors duration-200"
          >
            See all users →
          </Link>
        </div>
      )}
    </div>
  )
}
