'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  const router = useRouter()

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
      router.push('/login')
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
          toast.error('Could not unfollow. Please try again.')
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
          toast.error('Could not follow. Please try again.')
          return
        }

        setFollowingIds(prev => new Set(prev).add(creatorId))
        toast.success('Followed')
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
          <div key={i} className="w-full max-w-[200px] rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-3 w-2/3 mx-auto" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <UserPlus className="h-6 w-6" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">Unable to load creators</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Users className="h-6 w-6" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">No creators yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Join the community and start sharing!</p>
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
            <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 sm:space-y-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
              {/* Avatar with hover effect */}
              <Link href={`/profile/${creator.username}`} className="block relative mx-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 mx-auto ring-2 ring-primary/15 transition-transform duration-200 group-hover:scale-[1.03]">
                  <AvatarImage
                    src={getAvatarUrl(creator.avatar_url, creator.username)}
                    alt={creator.display_name || creator.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl font-bold">
                    {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              {/* Creator Info */}
              <div className="space-y-2">
                <Link
                  href={`/profile/${creator.username}`}
                  className="block"
                >
                  <h3 className="font-heading text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                    {creator.display_name || creator.username}
                  </h3>
                  <p className="font-mono text-[11px] tracking-wide text-muted-foreground mt-0.5">@{creator.username}</p>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {creator.bio || 'Exploring the world, one adventure at a time'}
                </p>
              </div>

              {/* Follow Button */}
              <Button
                onClick={() => handleFollowToggle(creator.id)}
                disabled={isLoadingFollow || !user}
                variant={isFollowing ? 'outline' : 'default'}
                className="w-full"
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
