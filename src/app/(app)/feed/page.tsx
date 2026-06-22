'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2, Compass, Users } from 'lucide-react'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedItem, type FeedAlbum } from '@/components/feed/FeedPost'
import { FeedSkeleton } from '@/components/ui/skeleton-screens'
import { SuggestedUsersRow } from '@/components/feed/SuggestedUsersRow'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { useSuggestedUsers } from '@/app/(app)/feed/useFeedPageData'
import { MemoryLaneCard } from '@/components/memories/MemoryLaneCard'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

type FeedMode = 'following' | 'discover'

const PAGE_SIZE = 10

// A rotating eyebrow line above the feed heading — changes once per day so the
// page feels alive without being noisy. Indexed by day so it's stable all day.
const DISPATCHES = [
  'Fresh dispatches from the trail',
  'Postcards from everywhere',
  'Notes from the road',
  'Where the wanderers are today',
  'The world, as your friends saw it',
  'New miles, freshly logged',
  'Dispatches from far-flung places',
  'Today’s view from somewhere far',
  'Stamps still drying',
  'What the explorers found',
]

type SupabaseClient = ReturnType<typeof createClient>

// Fetch a single page of the feed: resolve the visible author set, pull the
// albums (with up to 10 photos each), then attach per-album like/comment
// counts. Kept at module scope so it can be the React Query `queryFn` body —
// the result for each (mode, page) is cached, so revisiting the feed via the
// sidebar repaints instantly instead of re-running this waterfall.
async function fetchFeedPage(
  supabase: SupabaseClient,
  userId: string,
  mode: FeedMode,
  pageParam: number,
): Promise<FeedAlbum[]> {
  let userIds: string[] | null = null

  if (mode === 'following') {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')

    userIds = follows?.map((f) => f.following_id) || []

    // Bootstrap: on a brand-new account with 0 follows, include the
    // user's own posts so the Friends feed isn't empty. As soon as
    // they follow anyone, switch to a pure social feed (their own
    // posts live on Dashboard / Profile / Globe / Passport already).
    if (userIds.length === 0) {
      userIds.push(userId)
    }
  }

  let query = supabase
    .from('albums')
    .select(
      `
      id, title, description, location_name, country_code,
      latitude, longitude, created_at, date_start,
      cover_photo_url, cover_image_url, cover_photo_x_offset,
      cover_photo_y_offset, user_id,
      user:users!albums_user_id_fkey(id, username, display_name, avatar_url),
      photos(id, file_path, caption, taken_at)
    `
    )
    .order('created_at', { ascending: true, referencedTable: 'photos' })
    .limit(10, { referencedTable: 'photos' })
    .order('created_at', { ascending: false })
    .range(pageParam * PAGE_SIZE, pageParam * PAGE_SIZE + PAGE_SIZE - 1)

  if (mode === 'following' && userIds && userIds.length > 0) {
    // Never surface a followed user's PRIVATE albums. Show their public
    // and friends-only posts; always show the current user's own posts
    // (covers the brand-new-account bootstrap above).
    query = query
      .in('user_id', userIds)
      .or(`visibility.in.(public,friends),user_id.eq.${userId}`)
  } else if (mode === 'discover') {
    query = query.eq('visibility', 'public').neq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error

  const albumIds = (data || []).map((row) => row.id as string)

  // Fetch like and comment counts for the page in parallel. The
  // likes/comments tables are polymorphic (target_type + target_id) so
  // there is no album foreign-key embed available; we group counts here
  // instead. Both queries fire concurrently and are safe to fail
  // independently — a count outage shouldn't blank the feed.
  const [likesResult, commentsResult] = albumIds.length
    ? await Promise.all([
        supabase
          .from('likes')
          .select('target_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds),
        supabase
          .from('comments')
          .select('target_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds),
      ])
    : [{ data: [] as Array<{ target_id: string }> }, { data: [] as Array<{ target_id: string }> }]

  const likesByAlbum = new Map<string, number>()
  for (const row of (likesResult.data ?? []) as Array<{ target_id: string }>) {
    likesByAlbum.set(row.target_id, (likesByAlbum.get(row.target_id) ?? 0) + 1)
  }
  const commentsByAlbum = new Map<string, number>()
  for (const row of (commentsResult.data ?? []) as Array<{ target_id: string }>) {
    commentsByAlbum.set(row.target_id, (commentsByAlbum.get(row.target_id) ?? 0) + 1)
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const u = Array.isArray(row.user) ? row.user[0] : row.user
    const rawPhotos =
      (row.photos as Array<{ id: string; file_path: string; caption?: string; taken_at?: string }>) || []
    const coverSource = (row.cover_photo_url as string) || (row.cover_image_url as string) || ''
    const albumId = row.id as string
    return {
      id: albumId,
      title: (row.title as string) || 'Untitled',
      description: row.description as string | undefined,
      location: row.location_name as string | undefined,
      country_code: row.country_code as string | undefined,
      latitude: row.latitude as number | undefined,
      longitude: row.longitude as number | undefined,
      created_at: row.created_at as string,
      date_start: row.date_start as string | undefined,
      cover_image_url: (getPhotoUrl(coverSource) as string) || undefined,
      cover_photo_x_offset: row.cover_photo_x_offset as number | undefined,
      cover_photo_y_offset: row.cover_photo_y_offset as number | undefined,
      likes_count: likesByAlbum.get(albumId) ?? 0,
      comments_count: commentsByAlbum.get(albumId) ?? 0,
      user_id: row.user_id as string,
      user: {
        id: (u as { id?: string })?.id || (row.user_id as string),
        username: (u as { username?: string })?.username || 'unknown',
        display_name: (u as { display_name?: string })?.display_name || 'Explorer',
        avatar_url: (u as { avatar_url?: string })?.avatar_url,
      },
      photos: rawPhotos.map((p) => ({
        id: p.id,
        file_path: p.file_path,
        caption: p.caption,
        taken_at: p.taken_at,
      })),
    }
  })
}

export default function FeedPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<FeedMode>('following')

  // Pick today's dispatch line (rotates daily, stable within the day).
  const dailyDispatch = useMemo(
    () => DISPATCHES[Math.floor(Date.now() / 86_400_000) % DISPATCHES.length],
    [],
  )

  const supabase = useMemo(() => createClient(), [])
  const { users: suggestedUsers } = useSuggestedUsers(user?.id, 6)

  // React Query owns the feed cache (5min staleTime + refetchOnMount:false from
  // QueryProvider), so navigating away and back via the sidebar repaints from
  // cache instantly instead of re-running the follows -> albums -> counts
  // waterfall behind a skeleton. Keyed by mode so the two tabs cache apart.
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed', mode, user?.id],
    enabled: !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchFeedPage(supabase, user!.id, mode, pageParam)
      } catch (error) {
        log.error('Feed load failed', { component: 'Feed', action: 'load', userId: user!.id }, error as Error)
        throw error
      }
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  })

  const albums = useMemo<FeedAlbum[]>(() => data?.pages.flat() ?? [], [data])
  const loading = isLoading
  const loadError = isError
  const hasMore = !!hasNextPage
  const loadingMore = isFetchingNextPage

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8">
      {/* Editorial header — daily dispatch line + clean heading on its own row */}
      <header className="mb-4 space-y-1">
        <p className="al-eyebrow">{dailyDispatch}</p>
        <h1 className="al-display text-3xl md:text-4xl">Travel Memories</h1>
      </header>

      {/* Feed mode toggle — its own clear tab bar, not crammed by the title */}
      <nav
        aria-label="Feed mode"
        role="tablist"
        className="flex items-center gap-7 border-b border-border mb-6"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'following'}
          onClick={() => setMode('following')}
          className={`relative pb-2.5 text-[13px] font-semibold tracking-wide transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            mode === 'following'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Friends
          {mode === 'following' && (
            <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-primary" />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'discover'}
          onClick={() => setMode('discover')}
          className={`relative pb-2.5 text-[13px] font-semibold tracking-wide transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            mode === 'discover'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Discover
          {mode === 'discover' && (
            <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-primary" />
          )}
        </button>
      </nav>

      {/* Suggested travelers — compact, no Instagram rings */}
      {suggestedUsers.length > 0 && (
        <section
          aria-label="Suggested travelers"
          className="mb-6 pb-6 border-b border-border"
        >
          <p className="al-eyebrow mb-3">Travelers to follow</p>
          <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide">
            {suggestedUsers.slice(0, 7).map((u) => {
              const name = u.display_name || u.username || 'Explorer'
              return (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex flex-col items-center gap-1.5 min-w-[60px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                  aria-label={`View ${name}'s profile`}
                >
                  <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                    <OptimizedAvatar
                      src={u.avatar_url || undefined}
                      alt={name}
                      fallback={name[0]?.toUpperCase() || 'U'}
                      size="lg"
                      className="ring-2 ring-primary/20"
                    />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[60px] text-center">
                    {name.split(' ')[0]}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Discovery — single quiet row, only what matters */}
      <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
        >
          <Compass className="h-3 w-3" strokeWidth={2} />
          Explore
        </Link>
        <Link
          href="/travel-twins"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
        >
          <Users className="h-3 w-3" strokeWidth={2} />
          Travel twins
        </Link>
      </div>

      <MemoryLaneCard />

      {loading ? (
        <FeedSkeleton />
      ) : loadError && albums.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden>
            <Compass className="h-6 w-6" strokeWidth={1.6} />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Couldn&apos;t load your feed</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Something went wrong reaching the server. Check your connection and try again.
          </p>
          <Button size="pill" className="mt-5" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : albums.length === 0 ? (
        <EmptyState mode={mode} />
      ) : (
        <div className="space-y-8 mt-2">
          {albums.map((album, idx) => (
            <div key={album.id}>
              <FeedItem album={album} currentUserId={user.id} priority={idx === 0} />
              {idx === 2 && mode === 'following' && suggestedUsers.length > 0 && (
                <div className="my-8">
                  <SuggestedUsersRow users={suggestedUsers} />
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center py-8">
              <Button
                variant="outline"
                size="pill"
                onClick={() => fetchNextPage()}
                disabled={loadingMore}
                className="px-6"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ mode }: { mode: FeedMode }) {
  const router = useRouter()

  if (mode === 'following') {
    return (
      <EnhancedEmptyState
        icon={<Users className="h-6 w-6" strokeWidth={1.6} />}
        title="Your field is quiet"
        description="Follow a few travelers to fill your feed — every adventure they log shows up here."
        action={{ label: 'Find people to follow', onClick: () => router.push('/explore') }}
        secondaryAction={{ label: 'Create album', onClick: () => router.push('/albums/new') }}
      />
    )
  }

  return (
    <EnhancedEmptyState
      icon={<Compass className="h-6 w-6" strokeWidth={1.6} />}
      title="Nothing public yet"
      description="Be the first to share a public adventure. Others will find it here once you post."
      action={{ label: 'Create album', onClick: () => router.push('/albums/new') }}
      secondaryAction={{ label: 'Explore people', onClick: () => router.push('/explore') }}
    />
  )
}
