'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Compass, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedItem, type FeedAlbum } from '@/components/feed/FeedPost'
import { FeedSkeleton } from '@/components/ui/skeleton-screens'
import { SuggestedUsersRow } from '@/components/feed/SuggestedUsersRow'
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
        .order('created_at', { ascending: false })
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1)

      if (mode === 'following' && userIds && userIds.length > 0) {
        query = query.in('user_id', userIds)
      } else if (mode === 'discover') {
        query = query.eq('visibility', 'public').neq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error

      const mapped: FeedAlbum[] = (data || []).map((row: Record<string, unknown>) => {
        const u = Array.isArray(row.user) ? row.user[0] : row.user
        const rawPhotos =
          (row.photos as Array<{ id: string; file_path: string; caption?: string; taken_at?: string }>) || []
        const coverSource = (row.cover_photo_url as string) || (row.cover_image_url as string) || ''
        return {
          id: row.id as string,
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
          likes_count: 0,
          comments_count: 0,
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
        <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-5">
        <h1 className="al-display text-3xl md:text-4xl">Feed</h1>
        <div
          className="flex rounded-full p-[3px]"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <button
            onClick={() => setMode('following')}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
            style={{
              background: mode === 'following' ? 'var(--color-ink)' : 'transparent',
              color:
                mode === 'following' ? 'var(--color-ivory)' : 'var(--color-ink-soft)',
            }}
          >
            Friends
          </button>
          <button
            onClick={() => setMode('discover')}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
            style={{
              background: mode === 'discover' ? 'var(--color-ink)' : 'transparent',
              color:
                mode === 'discover' ? 'var(--color-ivory)' : 'var(--color-ink-soft)',
            }}
          >
            Discover
          </button>
        </div>
      </div>

      {/* Stories row — suggested travelers with conic-gradient rings */}
      {suggestedUsers.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4 -mx-4 px-4 scrollbar-hide">
          {suggestedUsers.slice(0, 7).map((u, idx) => {
            const colors = ['#E2553A', '#4A5D23', '#3F6BA3', '#C99B3B', '#A2322B', '#F2A179']
            const color = colors[idx % colors.length]
            const initial = (u.display_name || u.username || 'U')[0]?.toUpperCase() || 'U'
            return (
              <Link
                key={u.id}
                href={`/u/${u.username}`}
                className="flex flex-col items-center gap-1.5 min-w-[64px]"
              >
                <div
                  className="w-[60px] h-[60px] rounded-full p-[2px] flex items-center justify-center"
                  style={{
                    background:
                      'conic-gradient(from 0deg, #E2553A, #C99B3B, #4A5D23, #3F6BA3, #E2553A)',
                  }}
                >
                  <div
                    className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-semibold text-base"
                    style={{
                      background: color,
                      border: '2px solid var(--color-ivory)',
                    }}
                  >
                    {initial}
                  </div>
                </div>
                <span className="text-[10px] font-medium text-[color:var(--color-ink-soft)] truncate max-w-[64px]">
                  {(u.display_name || u.username || '').split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Discovery row — Explore + Travel Twins reachable from feed */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-4 px-4 scrollbar-hide">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap"
          style={{
            background: 'var(--color-ivory-alt)',
            color: 'var(--color-ink-soft)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <Compass className="h-3.5 w-3.5" />
          Explore
        </Link>
        <Link
          href="/travel-twins"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap"
          style={{
            background: 'var(--color-coral-tint)',
            color: 'var(--color-stamp)',
            border: '1px solid var(--color-coral)',
          }}
        >
          <Users className="h-3.5 w-3.5" />
          Travel Twins
        </Link>
        <Link
          href="/activity"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap"
          style={{
            background: 'var(--color-ivory-alt)',
            color: 'var(--color-ink-soft)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          Activity
        </Link>
      </div>

      <MemoryLaneCard />

      {loading ? (
        <FeedSkeleton />
      ) : albums.length === 0 ? (
        <EmptyState mode={mode} />
      ) : (
        <div className="space-y-6">
          {albums.map((album, idx) => (
            <div key={album.id}>
              <FeedItem album={album} currentUserId={user.id} />
              {idx === 2 && mode === 'following' && suggestedUsers.length > 0 && (
                <div className="my-6">
                  <SuggestedUsersRow users={suggestedUsers} />
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={() => loadFeed(page + 1, false)}
                disabled={loadingMore}
                className="rounded-full"
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
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-olive-100 dark:bg-olive-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        {mode === 'following' ? (
          <Users className="h-7 w-7 text-olive-600" />
        ) : (
          <Compass className="h-7 w-7 text-olive-600" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-2">
        {mode === 'following' ? 'Your feed is quiet' : 'No public adventures yet'}
      </h3>
      <p className="text-sm text-olive-600 dark:text-olive-400 mb-6 max-w-sm mx-auto">
        {mode === 'following'
          ? 'Follow other explorers or create your first album to fill your feed.'
          : 'Be the first to share a public adventure — others will discover it here.'}
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl">
          <Link href="/albums/new">Create album</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/explore">Explore people</Link>
        </Button>
      </div>
    </div>
  )
}
