'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { FollowButton } from '@/components/social/FollowButton'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface Creator {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  privacy_level: string
  albumCount?: number
  followerCount?: number
}

export default function CreatorsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: creators = [], isLoading: loading, error } = useQuery<Creator[]>({
    queryKey: ['explore-creators', user?.id ?? ''],
    queryFn: async () => {
      // Fetch users with their album counts
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, privacy_level')
        .eq('privacy_level', 'public')
        .neq('id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(24)

      if (usersError) throw usersError

      // Fetch album counts for each user
      const usersWithCounts = await Promise.all(
        (usersData || []).map(async (creator) => {
          const [albumsResult, followersResult] = await Promise.all([
            supabase
              .from('albums')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', creator.id)
              .neq('status', 'draft'),
            supabase
              .from('follows')
              .select('id', { count: 'exact', head: true })
              .eq('following_id', creator.id)
              .eq('status', 'accepted')
          ])

          return {
            ...creator,
            albumCount: albumsResult.count || 0,
            followerCount: followersResult.count || 0
          }
        })
      )

      // Sort by album count
      usersWithCounts.sort((a, b) => (b.albumCount || 0) - (a.albumCount || 0))

      return usersWithCounts
    },
  })

  // Preserve original error logging (query throws on failure → creators stays [])
  useEffect(() => {
    if (error) {
      log.error('Error fetching creators', { component: 'CreatorsPage', action: 'fetch-creators' }, error as Error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Explore
          </Link>
          <p className="al-eyebrow">Follow</p>
          <h1 className="al-display text-3xl md:text-4xl leading-[1.02]">
            Creators to follow
          </h1>
        </header>

        {/* Main Content */}
        <main>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-col items-center space-y-3">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">No creators found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Check back later for more travelers to follow
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Discover {creators.length} travelers and their adventures
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {creators.map((creator) => (
                  <div
                    key={creator.id}
                    className="group rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Link href={`/profile/${creator.username}`} className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Avatar className="h-24 w-24 ring-2 ring-primary/15 transition-transform duration-200 group-hover:scale-[1.03]">
                          <AvatarImage src={getAvatarUrl(creator.avatar_url, creator.username)} alt={creator.display_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                            {creator.display_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="w-full min-h-[80px]">
                        <Link
                          href={`/profile/${creator.username}`}
                          className="font-heading font-semibold text-foreground hover:text-primary transition-colors duration-200 line-clamp-1 block cursor-pointer rounded"
                        >
                          {creator.display_name}
                        </Link>
                        <p className="font-mono text-[11px] tracking-wide text-muted-foreground mb-2">@{creator.username}</p>

                        {creator.bio ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {creator.bio}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Adventure seeker
                          </p>
                        )}

                        <div className="flex items-center justify-center gap-3 mt-2 font-mono text-[11px] tracking-wide text-muted-foreground">
                          <span>{creator.albumCount || 0} albums</span>
                          <span>·</span>
                          <span>{creator.followerCount || 0} followers</span>
                        </div>
                      </div>

                      <FollowButton
                        userId={creator.id}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
