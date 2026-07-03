'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Users, Camera, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { FollowButton } from '@/components/social/FollowButton'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface Creator {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  privacy_level: string
  albumCount?: number
  followerCount?: number
  covers?: string[]
}

export default function CreatorsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: creators = [], isLoading: loading, error } = useQuery<Creator[]>({
    queryKey: ['explore-creators', user?.id ?? ''],
    queryFn: async () => {
      // Include public AND private accounts so people can discover and follow
      // either — but private accounts never expose their photos here (handled
      // per-creator below + on the card).
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, privacy_level')
        .neq('id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(24)

      if (usersError) throw usersError

      const creators = usersData || []
      const creatorIds = creators.map((c) => c.id)

      // Batched: two queries for the whole page instead of the previous N+1
      // storm (2 per creator = ~48 round-trips for 24 creators, which stalled
      // the page). Fetch every creator's albums and accepted-follower rows in
      // one call each, then aggregate in memory.
      const [allAlbumsRes, allFollowsRes] = creatorIds.length
        ? await Promise.all([
            supabase
              .from('albums')
              .select('id, user_id, cover_photo_url, cover_image_url, created_at, status')
              .in('user_id', creatorIds)
              .neq('status', 'draft')
              .order('created_at', { ascending: false }),
            supabase
              .from('follows')
              .select('following_id')
              .in('following_id', creatorIds)
              .eq('status', 'accepted'),
          ])
        : [{ data: [] }, { data: [] }]

      if ('error' in allAlbumsRes && allAlbumsRes.error) throw allAlbumsRes.error

      const albumsByUser = new Map<string, Array<{ cover_photo_url?: string | null; cover_image_url?: string | null }>>()
      for (const a of (allAlbumsRes.data || []) as Array<{ user_id: string; cover_photo_url?: string | null; cover_image_url?: string | null }>) {
        const list = albumsByUser.get(a.user_id) || []
        list.push(a)
        albumsByUser.set(a.user_id, list)
      }
      const followerCountByUser = new Map<string, number>()
      for (const f of (allFollowsRes.data || []) as Array<{ following_id: string }>) {
        followerCountByUser.set(f.following_id, (followerCountByUser.get(f.following_id) || 0) + 1)
      }

      const usersWithCounts = creators.map((creator) => {
        const isPublic = creator.privacy_level === 'public'
        const userAlbums = albumsByUser.get(creator.id) || []
        // Covers only for public accounts, capped at 3 (albums come pre-sorted
        // newest-first from the single query above).
        const covers = isPublic
          ? userAlbums
              .slice(0, 3)
              .map((a) => getPhotoUrl(a.cover_photo_url || a.cover_image_url))
              .filter((url): url is string => Boolean(url))
          : []
        return {
          ...creator,
          albumCount: userAlbums.length,
          followerCount: followerCountByUser.get(creator.id) || 0,
          covers,
        }
      })

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
          <p className="al-eyebrow">Discover people</p>
          <h1 className="al-display text-3xl md:text-4xl leading-[1.02]">
            Travelers to follow
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl pt-1">
            Public adventurers sharing their journeys — find someone new to follow.
          </p>
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

                      {/* Public accounts get a recent-photo preview strip
                          (Instagram "discover people"). Private accounts never
                          expose photos here — just the album/follower counts
                          above, plus a lock note. */}
                      {creator.privacy_level === 'public' ? (
                        <div className="grid w-full grid-cols-3 gap-1">
                          {(creator.covers || []).slice(0, 3).map((url, i) => (
                            <Link
                              key={i}
                              href={`/profile/${creator.username}`}
                              className="relative aspect-square overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Image
                                src={url}
                                alt=""
                                fill
                                sizes="80px"
                                className="object-cover transition-transform duration-200 hover:scale-105"
                              />
                            </Link>
                          ))}
                          {/* Fill empty slots so the strip keeps its shape */}
                          {Array.from({
                            length: Math.max(0, 3 - (creator.covers?.length || 0)),
                          }).map((_, i) => (
                            <div
                              key={`ph-${i}`}
                              className="flex aspect-square items-center justify-center rounded-md bg-muted/60"
                            >
                              <Camera className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-center gap-1.5 rounded-md bg-muted/50 py-2.5 text-[11px] font-medium text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Private — follow to see photos
                        </div>
                      )}

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
