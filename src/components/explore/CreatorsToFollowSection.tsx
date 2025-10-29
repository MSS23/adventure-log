'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'

interface CreatorsToFollowSectionProps {
  className?: string
  limit?: number
}

export function CreatorsToFollowSection({ className, limit = 8 }: CreatorsToFollowSectionProps) {
  const [creators, setCreators] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollows, setLoadingFollows] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  useEffect(() => {
    async function fetchCreators() {
      const supabase = createClient()

      try {
        setIsLoading(true)
        setError(null)

        // Fetch users with public profiles, ordered by created date
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('privacy_level', 'public')
          .neq('id', user?.id || '') // Exclude current user if logged in
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          log.error('Error fetching creators', {
            component: 'CreatorsToFollowSection',
            action: 'fetchCreators'
          }, fetchError)
          setError('Failed to load creators')
          return
        }

        setCreators(data || [])

        // Fetch current user's following list
        if (user) {
          const { data: followsData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)

          if (followsData) {
            setFollowingIds(new Set(followsData.map(f => f.following_id)))
          }
        }
      } catch (err) {
        log.error('Error in fetchCreators', {
          component: 'CreatorsToFollowSection',
          action: 'fetchCreators'
        }, err as Error)
        setError('Failed to load creators')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCreators()
  }, [limit, user])

  const handleFollowToggle = async (creatorId: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/login'
      return
    }

    const supabase = createClient()
    const isFollowing = followingIds.has(creatorId)

    // Add to loading state
    setLoadingFollows(prev => new Set(prev).add(creatorId))

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId)

        if (error) {
          log.error('Error unfollowing user', {
            component: 'CreatorsToFollowSection',
            action: 'handleFollowToggle',
            creatorId
          }, error)
          return
        }

        setFollowingIds(prev => {
          const next = new Set(prev)
          next.delete(creatorId)
          return next
        })
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: creatorId,
            status: 'approved'
          })

        if (error) {
          log.error('Error following user', {
            component: 'CreatorsToFollowSection',
            action: 'handleFollowToggle',
            creatorId
          }, error)
          return
        }

        setFollowingIds(prev => new Set(prev).add(creatorId))
      }
    } catch (err) {
      log.error('Error toggling follow', {
        component: 'CreatorsToFollowSection',
        action: 'handleFollowToggle',
        creatorId
      }, err as Error)
    } finally {
      // Remove from loading state
      setLoadingFollows(prev => {
        const next = new Set(prev)
        next.delete(creatorId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-9 w-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No creators to display yet</p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6", className)}>
      {creators.map((creator) => {
        const isFollowing = followingIds.has(creator.id)
        const isLoadingFollow = loadingFollows.has(creator.id)

        return (
          <div
            key={creator.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <Link href={`/profile/${creator.username}`} className="block">
                <Avatar className="h-24 w-24 border-2 border-gray-100 hover:border-teal-400 transition-colors">
                  <AvatarImage
                    src={creator.avatar_url || undefined}
                    alt={creator.display_name || creator.username}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-2xl font-bold">
                    {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              {/* Creator Info */}
              <div className="space-y-1 min-h-[60px] flex flex-col justify-start w-full">
                <Link
                  href={`/profile/${creator.username}`}
                  className="font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1"
                >
                  {creator.display_name || creator.username}
                </Link>
                {creator.bio ? (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {creator.bio}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Adventure seeker
                  </p>
                )}
              </div>

              {/* Follow Button */}
              <Button
                onClick={() => handleFollowToggle(creator.id)}
                disabled={isLoadingFollow || !user}
                className={cn(
                  "w-full font-medium rounded-lg transition-all duration-200",
                  isFollowing
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-teal-500 text-white hover:bg-teal-600"
                )}
                size="sm"
              >
                {isLoadingFollow ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isFollowing ? 'Unfollowing...' : 'Following...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
