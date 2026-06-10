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

  const supabase = useMemo(() => createClient(), [])
  const { users: suggestedUsers } = useSuggestedUsers(user?.id, 6)

  const loadFeed = useCallback(async (nextPage: number, replace: boolean) => {
    if (!user) return

    try {
      if (nextPage === 0) setLoading(true)
      else setLoadingMore(true)

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
        query = query.in('user_id', userIds)
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
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-forest)]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Editorial header — eyebrow + display heading */}
      <header className="mb-7">
        <p className="al-eyebrow mb-2">The latest from your travelers</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="al-display text-[36px] md:text-[44px] leading-[0.95]">
            <em className="italic font-normal">Field</em> Feed
          </h1>

          {/* Quiet toggle — underline, not pill */}
          <nav
            aria-label="Feed mode"
            className="flex items-center gap-5 pb-1"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={mode === 'following'}
              onClick={() => setMode('following')}
              className={`relative pb-1.5 text-[12px] font-semibold tracking-wide uppercase transition-colors ${
                mode === 'following'
                  ? 'text-[color:var(--color-ink)]'
                  : 'text-[color:var(--color-muted-warm)] hover:text-[color:var(--color-ink-soft)]'
              }`}
            >
              Friends
              {mode === 'following' && (
                <span
                  className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full"
                  style={{ background: 'var(--color-forest)' }}
                />
              )}
            </button>
            <button
              role="tab"
              aria-selected={mode === 'discover'}
              onClick={() => setMode('discover')}
              className={`relative pb-1.5 text-[12px] font-semibold tracking-wide uppercase transition-colors ${
                mode === 'discover'
                  ? 'text-[color:var(--color-ink)]'
                  : 'text-[color:var(--color-muted-warm)] hover:text-[color:var(--color-ink-soft)]'
              }`}
            >
              Discover
              {mode === 'discover' && (
                <span
                  className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full"
                  style={{ background: 'var(--color-forest)' }}
                />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Suggested travelers — compact, no Instagram rings */}
      {suggestedUsers.length > 0 && (
        <section
          aria-label="Suggested travelers"
          className="mb-6 pb-5 border-b border-[color:var(--color-line-warm)]"
        >
          <p className="al-eyebrow mb-3">Travelers to follow</p>
          <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide">
            {suggestedUsers.slice(0, 7).map((u) => {
              const name = u.display_name || u.username || 'Explorer'
              return (
                <Link
                  key={u.id}
                  href={`/u/${u.username}`}
                  className="flex flex-col items-center gap-1.5 min-w-[60px] group"
                  aria-label={`View ${name}'s profile`}
                >
                  <span className="transition-transform group-hover:-translate-y-0.5">
                    <OptimizedAvatar
                      src={u.avatar_url || undefined}
                      alt={name}
                      fallback={name[0]?.toUpperCase() || 'U'}
                      size="lg"
                      className="ring-2 ring-[color:var(--color-forest-tint)]"
                    />
                  </span>
                  <span className="text-[11px] font-medium text-[color:var(--color-ink-soft)] truncate max-w-[60px] text-center">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap transition-colors hover:bg-[color:var(--color-forest-tint)] hover:text-[color:var(--color-forest)]"
          style={{
            background: 'var(--color-ivory-alt)',
            color: 'var(--color-ink-soft)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <Compass className="h-3 w-3" strokeWidth={2} />
          Explore
        </Link>
        <Link
          href="/travel-twins"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap transition-colors hover:bg-[color:var(--color-forest-tint)] hover:text-[color:var(--color-forest)]"
          style={{
            background: 'var(--color-ivory-alt)',
            color: 'var(--color-ink-soft)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <Users className="h-3 w-3" strokeWidth={2} />
          Travel twins
        </Link>
      </div>

      <MemoryLaneCard />

      {loading ? (
        <FeedSkeleton />
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
                onClick={() => loadFeed(page + 1, false)}
                disabled={loadingMore}
                className="rounded-full px-6"
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
    <div className="text-center py-20 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{
          background: 'var(--color-forest-tint)',
          color: 'var(--color-forest)',
        }}
        aria-hidden
      >
        {mode === 'following' ? (
          <Users className="h-7 w-7" strokeWidth={1.6} />
        ) : (
          <Compass className="h-7 w-7" strokeWidth={1.6} />
        )}
      </div>
      <h3 className="font-heading text-[24px] font-semibold text-[color:var(--color-ink)] mb-2">
        {mode === 'following' ? 'Your field is quiet' : 'Nothing public yet'}
      </h3>
      <p className="text-[14px] leading-[1.6] text-[color:var(--color-ink-soft)] mb-7 max-w-sm mx-auto">
        {mode === 'following'
          ? 'Follow a few travelers to fill your feed — every adventure they log shows up here.'
          : 'Be the first to share a public adventure. Others will find it here once you post.'}
      </p>
      <div className="flex gap-3 justify-center">
        {mode === 'following' ? (
          <>
            <Button
              asChild
              className="rounded-full px-5 text-[13px] font-semibold"
              style={{
                background: 'var(--color-forest)',
                color: 'var(--color-ivory)',
              }}
            >
              <Link href="/explore">Find people to follow</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-5 text-[13px]">
              <Link href="/albums/new">Create album</Link>
            </Button>
          </>
        ) : (
          <>
            <Button
              asChild
              className="rounded-full px-5 text-[13px] font-semibold"
              style={{
                background: 'var(--color-forest)',
                color: 'var(--color-ivory)',
              }}
            >
              <Link href="/albums/new">Create album</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-5 text-[13px]">
              <Link href="/explore">Explore people</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
