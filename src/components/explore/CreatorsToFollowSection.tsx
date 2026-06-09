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
import { getAvatarUrl } from '@/lib/utils/avatar'

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
      // Redirect to Clerk sign-in if not authenticated
      window.location.href = '/sign-in'
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
            status: 'accepted'
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
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 justify-items-center", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-4 w-full max-w-[200px]">
            <div className="relative">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-gradient-to-br from-stone-100 dark:from-white/[0.06] to-stone-200 dark:to-white/[0.08] animate-pulse" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-stone-200 dark:bg-white/[0.08] border-4 border-white dark:border-[#1B170E] animate-pulse" />
            </div>
            <div className="space-y-2 w-full">
              <div className="h-5 bg-stone-200 dark:bg-white/[0.08] rounded-md animate-pulse mx-auto w-3/4" />
              <div className="h-4 bg-stone-100 dark:bg-white/[0.06] rounded-md animate-pulse mx-auto w-2/3" />
            </div>
            <div className="h-10 w-32 bg-gradient-to-r from-stone-200 dark:from-white/[0.08] to-stone-100 dark:to-white/[0.06] rounded-lg animate-pulse mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 rounded-full mb-4 bg-[color:var(--color-coral-tint)]">
          <UserPlus className="h-8 w-8" style={{ color: 'var(--color-coral)' }} />
        </div>
        <p className="text-[color:var(--color-ink)] font-semibold mb-2">Unable to load creators</p>
        <p className="text-[color:var(--color-ink-soft)] text-sm">{error}</p>
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 rounded-full mb-4 bg-[color:var(--color-forest-tint)]">
          <Users className="h-8 w-8" style={{ color: 'var(--color-forest)' }} />
        </div>
        <p className="text-[color:var(--color-ink)] font-semibold mb-2">No creators yet</p>
        <p className="text-[color:var(--color-ink-soft)] text-sm">Join the community and start sharing!</p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 justify-items-center", className)}>
      {creators.map((creator) => {
        const isFollowing = followingIds.has(creator.id)
        const isLoadingFollow = loadingFollows.has(creator.id)

        return (
          <div
            key={creator.id}
            className="group flex flex-col items-center text-center w-full max-w-[200px] mx-auto"
          >
            {/* Card Container */}
            <div
              className="rounded-2xl p-4 sm:p-5 md:p-6 w-full border border-[color:var(--color-line-warm)] hover:shadow-[0_18px_40px_-20px_rgba(26,20,14,0.25)] hover:-translate-y-1 transition-all duration-300 space-y-3 sm:space-y-4"
              style={{ background: 'var(--card)' }}
            >
              {/* Avatar with hover effect */}
              <Link href={`/profile/${creator.username}`} className="block relative mx-auto">
                <div className="relative">
                  <Avatar
                    className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 ring-4 group-hover:scale-105 transition-all duration-300"
                    style={{ '--tw-ring-color': 'var(--color-forest-tint)' } as React.CSSProperties}
                  >
                    <AvatarImage
                      src={getAvatarUrl(creator.avatar_url, creator.username)}
                      alt={creator.display_name || creator.username}
                      className="object-cover"
                    />
                    <AvatarFallback
                      className="text-xl sm:text-2xl md:text-3xl font-bold"
                      style={{ background: 'var(--color-forest-tint)', color: 'var(--color-forest)' }}
                    >
                      {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 rounded-full"
                    style={{ background: 'var(--color-forest-soft)', border: '4px solid var(--card)' }}
                  />
                </div>
              </Link>

              {/* Creator Info */}
              <div className="space-y-2">
                <Link
                  href={`/profile/${creator.username}`}
                  className="block"
                >
                  <h3 className="font-heading font-semibold text-[color:var(--color-ink)] hover:text-[color:var(--color-forest)] transition-colors text-base line-clamp-1">
                    {creator.display_name || creator.username}
                  </h3>
                  <p className="font-mono text-[11px] tracking-[0.04em] text-[color:var(--color-muted-warm)] mt-0.5">@{creator.username}</p>
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)] line-clamp-2 h-10">
                  {creator.bio || 'Exploring the world, one adventure at a time'}
                </p>
              </div>

              {/* Follow Button */}
              <Button
                onClick={() => handleFollowToggle(creator.id)}
                disabled={isLoadingFollow || !user}
                className="w-full font-semibold rounded-full transition-all duration-200 shadow-sm hover:shadow-md border-0"
                style={
                  isFollowing
                    ? { background: 'var(--color-ivory-alt)', color: 'var(--color-ink-soft)', border: '1px solid var(--color-line-warm)' }
                    : { background: 'var(--color-forest)', color: 'var(--color-ivory)' }
                }
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
