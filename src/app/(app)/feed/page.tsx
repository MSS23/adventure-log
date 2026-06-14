'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Compass, Users } from 'lucide-react'
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

export default function FeedPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<FeedMode>('following')
  const [albums, setAlbums] = useState<FeedAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const { users: suggestedUsers } = useSuggestedUsers(user?.id, 6)

  const loadFeed = useCallback(async (nextPage: number, replace: boolean) => {
    if (!user) return

    try {
      if (nextPage === 0) setLoading(true)
      else setLoadingMore(true)
      setLoadError(false)

      let userIds: string[] | null = null

      if (mode === 'following') {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted')

        userIds = follows?.map((f) => f.following_id) || []

        // Bootstrap: on a brand-new account with 0 follows, include the
        // user's own posts so the Friends feed isn't empty. As soon as
        // they follow anyone, switch to a pure social feed (their own
        // posts live on Dashboard / Profile / Globe / Passport already).
        if (userIds.length === 0) {
          userIds.push(user.id)
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
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1)

      if (mode === 'following' && userIds && userIds.length > 0) {
        // Never surface a followed user's PRIVATE albums. Show their public
        // and friends-only posts; always show the current user's own posts
        // (covers the brand-new-account bootstrap above).
        query = query
          .in('user_id', userIds)
          .or(`visibility.in.(public,friends),user_id.eq.${user.id}`)
      } else if (mode === 'discover') {
        query = query.eq('visibility', 'public').neq('user_id', user.id)
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

      const mapped: FeedAlbum[] = (data || []).map((row: Record<string, unknown>) => {
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

      setAlbums((prev) => (replace ? mapped : [...prev, ...mapped]))
      setHasMore(mapped.length === PAGE_SIZE)
      setPage(nextPage)
    } catch (error) {
      log.error('Feed load failed', { component: 'Feed', action: 'load', userId: user.id }, error as Error)
      // Only surface a full-page error when the initial load fails; a failed
      // "load more" leaves the already-shown posts intact.
      if (replace) setLoadError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [supabase, user, mode])

  useEffect(() => {
    if (user) {
      setAlbums([])
      setPage(0)
      setHasMore(true)
      loadFeed(0, true)
    }
  }, [user, mode, loadFeed])

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8">
      {/* Editorial header — eyebrow + display heading */}
      <header className="mb-8 space-y-1">
        <p className="al-eyebrow">The latest from your travelers</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="al-display text-3xl md:text-4xl">
            <em className="italic font-normal">Field</em> Feed
          </h1>

          {/* Quiet toggle — underline, not pill */}
          <nav
            aria-label="Feed mode"
            className="flex items-center gap-6 pb-1"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={mode === 'following'}
              onClick={() => setMode('following')}
              className={`relative pb-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                mode === 'following'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Friends
              {mode === 'following' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-primary" />
              )}
            </button>
            <button
              role="tab"
              aria-selected={mode === 'discover'}
              onClick={() => setMode('discover')}
              className={`relative pb-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                mode === 'discover'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Discover
              {mode === 'discover' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-primary" />
              )}
            </button>
          </nav>
        </div>
      </header>

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
                  href={`/u/${u.username}`}
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
          <Button size="pill" className="mt-5" onClick={() => loadFeed(0, true)}>
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
                onClick={() => loadFeed(page + 1, false)}
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
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        {mode === 'following' ? (
          <Users className="h-6 w-6" strokeWidth={1.6} />
        ) : (
          <Compass className="h-6 w-6" strokeWidth={1.6} />
        )}
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {mode === 'following' ? 'Your field is quiet' : 'Nothing public yet'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {mode === 'following'
          ? 'Follow a few travelers to fill your feed — every adventure they log shows up here.'
          : 'Be the first to share a public adventure. Others will find it here once you post.'}
      </p>
      <div className="mt-5 flex gap-3 justify-center">
        {mode === 'following' ? (
          <>
            <Button asChild size="pill">
              <Link href="/explore">Find people to follow</Link>
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link href="/albums/new">Create album</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="pill">
              <Link href="/albums/new">Create album</Link>
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link href="/explore">Explore people</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
