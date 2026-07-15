'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Loader2, Compass, Users, MapPinned, Images, ArrowUpRight } from 'lucide-react'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedItem, type FeedAlbum } from '@/components/feed/FeedPost'
import { FeedSkeleton } from '@/components/ui/skeleton-screens'
import { SuggestedUsersRow } from '@/components/feed/SuggestedUsersRow'
import { useSuggestedUsers } from '@/app/(app)/feed/useFeedPageData'
import { MemoryLaneCard } from '@/components/memories/MemoryLaneCard'
import { FirstRunGuide } from '@/components/feed/FirstRunGuide'
import { ClaimHandleCard } from '@/components/feed/ClaimHandleCard'
import { CollaborationInvites } from '@/components/albums/CollaborationInvites'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

type FeedMode = 'following' | 'discover'

const PAGE_SIZE = 10

function feedAvatarUrl(url: string | null | undefined): string | undefined {
  // Seeded DiceBear URLs are useful in fixtures, but a missing or stale image
  // allowlist must never be able to take down the entire feed. Initials are a
  // cleaner failure mode than promoting an avatar error to the page boundary.
  if (!url || url.startsWith('https://api.dicebear.com/')) return undefined
  return url
}

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
    // WHY: order embedded photos by order_index first (created_at as
    // tiebreaker) to match the album page — order_index is what uploads and
    // reorders actually write; the previous display_order sort read a column
    // that is never populated, so feed carousels ignored the user's order.
    .order('order_index', { ascending: true, referencedTable: 'photos' })
    .order('created_at', { ascending: true, referencedTable: 'photos' })
    .limit(10, { referencedTable: 'photos' })
    // WHY: RLS only enforces visibility, not publish state — without this,
    // photo-less DRAFT albums surface in the feed as empty "No photos" cards.
    // Legacy albums can have NULL status (see the m17 discover-feed hedge
    // `status IS NULL OR status = 'published'`), and a bare .neq('status',
    // 'draft') would exclude those NULL rows in SQL, so keep them explicitly.
    .or('status.is.null,status.neq.draft')
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
  //
  // The likes query also selects user_id so the viewer's own liked set falls
  // out of the SAME rows — that seeds `is_liked` on every feed item, which
  // lets useLikes skip its per-mount likes?...limit=1 existence check.
  // Before this, every LikeButton + PhotoCarousel fired that query
  // individually (~20 queries per page of 10 posts — a verbatim query shape
  // from a production statement-timeout incident).
  const [likesResult, commentsResult] = albumIds.length
    ? await Promise.all([
        supabase
          .from('likes')
          .select('target_id, user_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds),
        supabase
          .from('comments')
          .select('target_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds),
      ])
    : [
        { data: [] as Array<{ target_id: string; user_id: string }> },
        { data: [] as Array<{ target_id: string }> },
      ]

  const likesByAlbum = new Map<string, number>()
  const likedByViewer = new Set<string>()
  for (const row of (likesResult.data ?? []) as Array<{ target_id: string; user_id: string }>) {
    likesByAlbum.set(row.target_id, (likesByAlbum.get(row.target_id) ?? 0) + 1)
    if (row.user_id === userId) {
      likedByViewer.add(row.target_id)
    }
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
      is_liked: likedByViewer.has(albumId),
      user_id: row.user_id as string,
      user: {
        id: (u as { id?: string })?.id || (row.user_id as string),
        username: (u as { username?: string })?.username || 'unknown',
        display_name: (u as { display_name?: string })?.display_name || 'Explorer',
        avatar_url: feedAvatarUrl((u as { avatar_url?: string })?.avatar_url),
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
    // WHY: the free-tier Supabase instance cold-starts after idle, and the
    // first queries then die at the network layer ("TypeError: Failed to
    // fetch") for several seconds. The provider default (2 retries, ~3s
    // total) gives up inside that window and strands the feed on the error
    // card until a manual retry — the same failure mode the globe timeline
    // fixed with its own retry loop. 5 attempts with capped backoff spans
    // ~25s, comfortably past a cold start.
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  })

  const albums = useMemo<FeedAlbum[]>(() => {
    // WHY: pages are fetched by offset (.range), so albums inserted between
    // fetches shift the window and page N+1 can repeat page N's tail. Keep the
    // first occurrence per id to avoid duplicate posts / duplicate React keys.
    const seen = new Set<string>()
    const unique: FeedAlbum[] = []
    for (const album of data?.pages.flat() ?? []) {
      if (!seen.has(album.id)) {
        seen.add(album.id)
        unique.push(album)
      }
    }
    return unique
  }, [data])
  const loading = isLoading
  const loadError = isError
  const hasMore = !!hasNextPage
  const loadingMore = isFetchingNextPage

  // First-run: Feed is the home surface (Dashboard is gone), so the
  // brand-new-account guide lives here. One cheap count query decides it.
  const { data: myAlbumCount } = useQuery({
    queryKey: ['my-album-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from('albums')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
      return count ?? 0
    },
  })
  const isFirstRun = myAlbumCount === 0

  // Brand-new account (0 follows, 0 albums): the Friends tab resolves to an
  // empty list, which new users consistently read as "the feed doesn't load".
  // Swap them to Discover once so their first screen has real content; the
  // flag makes it one-time, so tabbing back to Friends is respected.
  const [autoSwitchedToDiscover, setAutoSwitchedToDiscover] = useState(false)
  useEffect(() => {
    if (
      !autoSwitchedToDiscover &&
      mode === 'following' &&
      !loading &&
      !loadError &&
      albums.length === 0 &&
      myAlbumCount === 0
    ) {
      setAutoSwitchedToDiscover(true)
      setMode('discover')
    }
  }, [autoSwitchedToDiscover, mode, loading, loadError, albums.length, myAlbumCount])

  // Infinite scroll: a sentinel above the "Load more" fallback button fetches
  // the next page as it approaches the viewport — the button remains for
  // reduced-motion/failed-observer cases.
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '600px',
    triggerOnce: false,
  })
  useEffect(() => {
    if (isIntersecting && hasMore && !loadingMore) {
      fetchNextPage()
    }
  }, [isIntersecting, hasMore, loadingMore, fetchNextPage])

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={async () => { await refetch() }}>
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8">
      {/* Editorial header — daily dispatch line + clean heading on its own row */}
      <header className="relative mb-5 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <div aria-hidden className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="al-eyebrow">{dailyDispatch}</p>
            <h1 className="al-display text-3xl md:text-4xl">Your world, worth keeping.</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              New stories from people you trust, old memories worth returning to, and your next place.
            </p>
          </div>
          <Link
            href="/albums/import"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[0_6px_18px_rgba(185,74,58,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Images className="h-4 w-4" aria-hidden />
            Add memories
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {/* New email accounts carry a machine handle — offer the fix in place */}
      <ClaimHandleCard />

      {/* Pending collaborative-album invites (moved from the old dashboard) */}
      <CollaborationInvites />

      {/* Brand-new account: explain the loop before showing an empty feed */}
      {isFirstRun && <FirstRunGuide />}

      {/* Feed mode toggle — its own clear tab bar, not crammed by the title */}
      <nav
        aria-label="Feed mode"
        role="tablist"
        className="mb-4 grid grid-cols-2 rounded-2xl border border-border bg-muted/55 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'following'}
          onClick={() => setMode('following')}
          className={`relative min-h-11 rounded-xl px-4 text-[13px] font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            mode === 'following'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
          }`}
        >
          Friends
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'discover'}
          onClick={() => setMode('discover')}
          className={`relative min-h-11 rounded-xl px-4 text-[13px] font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            mode === 'discover'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
          }`}
        >
          Discover
        </button>
      </nav>

      {/* Suggested travelers used to render here as a second avatar strip —
          removed: it duplicated the SuggestedUsersRow injected into the feed
          below (which has follow buttons) and pushed the first post below the
          fold behind up to six stacked cards. */}

      {/* Discovery — single quiet row, only what matters */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Link
          href="/explore"
          className="inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card px-2 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground shadow-[var(--shadow-resting)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
        >
          <Compass className="h-3 w-3" strokeWidth={2} />
          Trusted places
        </Link>
        <Link
          href="/globe"
          className="inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card px-2 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground shadow-[var(--shadow-resting)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
        >
          <MapPinned className="h-3 w-3" strokeWidth={2} />
          Your world
        </Link>
        <Link
          href="/travel-twins"
          className="inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card px-2 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground shadow-[var(--shadow-resting)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
        >
          <Users className="h-3 w-3" strokeWidth={2} />
          Travel twins
        </Link>
      </div>

      <MemoryLaneCard />

      {/* Context line for the one-time empty-Friends → Discover swap above */}
      {autoSwitchedToDiscover && mode === 'discover' && (
        <p className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Your Friends feed is empty for now, so here&apos;s what travelers everywhere are
          posting. Follow a few of them to build your own feed.
        </p>
      )}

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
              {/* Both tabs get the suggestions row (it's the only one now —
                  the old header avatar strip was removed as a duplicate). */}
              {idx === 2 && suggestedUsers.length > 0 && (
                <div className="my-8">
                  <SuggestedUsersRow users={suggestedUsers} />
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <>
              {/* Auto-load sentinel — fires ~600px before it's visible */}
              <div ref={sentinelRef} aria-hidden className="h-px" />
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
            </>
          )}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}

function EmptyState({ mode }: { mode: FeedMode }) {
  const router = useRouter()

  if (mode === 'following') {
    return (
      <EnhancedEmptyState
        icon={<Users className="h-6 w-6" strokeWidth={1.6} />}
        title="Your feed is empty"
        description="Follow a few travelers to fill it — every album they post shows up here."
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
