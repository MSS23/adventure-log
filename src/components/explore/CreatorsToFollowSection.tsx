'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Users } from 'lucide-react'
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
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gray-200 border-4 border-white animate-pulse" />
            </div>
            <div className="space-y-2 w-full">
              <div className="h-5 bg-gray-200 rounded-md animate-pulse mx-auto w-3/4" />
              <div className="h-4 bg-gray-100 rounded-md animate-pulse mx-auto w-2/3" />
            </div>
            <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <UserPlus className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-gray-700 font-medium mb-2">Unable to load creators</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-gray-50 rounded-full mb-4">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium mb-2">No creators yet</p>
        <p className="text-gray-500 text-sm">Join the community and start sharing!</p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6", className)}>
      {creators.map((creator) => {
        const isFollowing = followingIds.has(creator.id)
        const isLoadingFollow = loadingFollows.has(creator.id)

        return (
          <div
            key={creator.id}
            className="group flex flex-col items-center text-center"
          >
            {/* Card Container */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 w-full border border-gray-100 hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-3 sm:space-y-4">
              {/* Avatar with hover effect */}
              <Link href={`/profile/${creator.username}`} className="block relative mx-auto">
                <div className="relative">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 ring-4 ring-gray-50 group-hover:ring-teal-100 group-hover:scale-105 transition-all duration-300">
                    <AvatarImage
                      src={creator.avatar_url || undefined}
                      alt={creator.display_name || creator.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-xl sm:text-2xl md:text-3xl font-bold">
                      {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Optional: Status indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 bg-green-500 rounded-full border-3 sm:border-4 border-white" />
                </div>
              </Link>

              {/* Creator Info */}
              <div className="space-y-2">
                <Link
                  href={`/profile/${creator.username}`}
                  className="block"
                >
                  <h3 className="font-semibold text-gray-900 hover:text-teal-600 transition-colors text-base line-clamp-1">
                    {creator.display_name || creator.username}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">@{creator.username}</p>
                </Link>
                <p className="text-sm text-gray-600 line-clamp-2 h-10">
                  {creator.bio || 'Exploring the world, one adventure at a time'}
                </p>
              </div>

              {/* Follow Button */}
              <Button
                onClick={() => handleFollowToggle(creator.id)}
                disabled={isLoadingFollow || !user}
                className={cn(
                  "w-full font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md",
                  isFollowing
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    : "bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700"
                )}
                size="default"
              >
                {isLoadingFollow ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
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
