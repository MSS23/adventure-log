'use client'

import { useState, useMemo } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import type { ActivityFeedItemWithDetails } from '@/lib/hooks/useActivityFeed'
import { Bell, BellOff, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NoNotificationsEmptyState } from '@/components/ui/enhanced-empty-state'
import { useUnreadCount } from '@/components/activity/UnreadCountProvider'
import { log } from '@/lib/utils/logger'

type TabType = 'all' | 'yours' | 'others'

const PAGE_SIZE = 30

type SupabaseClient = ReturnType<typeof createClient>

// Fetch one page of the activity feed. Mirrors useActivityFeed.fetchActivityFeed:
// pull raw activity rows (no FK-hint joins), then enrich with user + album data
// in follow-up queries. Lives at module scope so it can be the React Query
// queryFn body — each page is cached so revisiting Activity repaints instantly.
async function fetchActivityPage(
  supabase: SupabaseClient,
  pageParam: number,
): Promise<ActivityFeedItemWithDetails[]> {
  const offset = pageParam * PAGE_SIZE

  const { data: rawActivities, error: fetchError } = await supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (fetchError) {
    log.error('Error fetching activity feed', {
      component: 'ActivityPage',
      action: 'fetchActivityPage',
      error: fetchError,
    })
    throw fetchError
  }

  const userIds = [...new Set((rawActivities || []).flatMap(a => [a.user_id, a.target_user_id].filter(Boolean)))]
  const albumIds = [...new Set((rawActivities || []).map(a => a.target_album_id).filter(Boolean))]

  const [usersResult, albumsResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
      : { data: [], error: null },
    albumIds.length > 0
      ? supabase.from('albums').select('id, title, cover_photo_url').in('id', albumIds)
      : { data: [], error: null },
  ])

  const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]))
  const albumsMap = new Map((albumsResult.data || []).map(a => [a.id, a]))

  const data = (rawActivities || []).map(activity => ({
    ...activity,
    user: usersMap.get(activity.user_id) || undefined,
    target_user: activity.target_user_id ? usersMap.get(activity.target_user_id) || undefined : undefined,
    target_album: activity.target_album_id ? albumsMap.get(activity.target_album_id) || undefined : undefined,
    target_comment: undefined,
  }))

  return data as ActivityFeedItemWithDetails[]
}

export default function ActivityPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])

  const { refreshCount, decrementCount } = useUnreadCount()
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const queryKey = useMemo(() => ['activity-feed', user?.id], [user?.id])

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ActivityFeedItemWithDetails[]>({
    queryKey,
    enabled: !!user,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchActivityPage(supabase, pageParam as number),
    // "Load more" is available only while the last page was full (parity with
    // the previous `activities.length % 30 === 0` heuristic).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  })

  const activities = useMemo(
    () => data?.pages.flat() ?? [],
    [data]
  )

  // Combined fetching state mirrors the hook's single isLoading flag (used for
  // both initial load and "Load more").
  const isFetching = isLoading || isFetchingNextPage

  // Whether another full page is likely available — drives the "Load more"
  // button visibility, replacing the old `length % 30 === 0` check.
  const lastPageFull = (data?.pages[data.pages.length - 1]?.length ?? 0) === PAGE_SIZE

  // Mark a single activity as read. Optimistically flips is_read across all
  // cached pages so the row updates immediately, then persists to the DB and
  // reverts on failure (parity with useActivityFeed.markAsRead).
  const markAsRead = async (activityId: string) => {
    const previous = queryClient.getQueryData<InfiniteData<ActivityFeedItemWithDetails[]>>(queryKey)

    queryClient.setQueryData<InfiniteData<ActivityFeedItemWithDetails[]>>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map(page =>
              page.map(a => (a.id === activityId ? { ...a, is_read: true } : a))
            ),
          }
        : old
    )

    try {
      const { error: updateError } = await supabase
        .from('activity_feed')
        .update({ is_read: true })
        .eq('id', activityId)

      if (updateError) {
        log.error('Error marking activity as read', {
          component: 'ActivityPage',
          action: 'markAsRead',
          error: updateError,
        })
        if (previous) queryClient.setQueryData(queryKey, previous)
      }
    } catch (err) {
      log.error('Failed to mark activity as read', { component: 'ActivityPage', action: 'markAsRead' }, err)
      if (previous) queryClient.setQueryData(queryKey, previous)
    }
  }

  // Only activities targeted AT me count as "unread notifications" —
  // activities I performed myself never get is_read flipped and would otherwise
  // keep the badge stuck after Mark-all-as-read.
  const unreadCount = activities.filter(
    a => !a.is_read && a.target_user_id === user?.id
  ).length

  const yourActivities = useMemo(
    () => activities.filter(a => a.user_id === user?.id),
    [activities, user?.id]
  )

  const otherActivities = useMemo(
    () => activities.filter(a => a.user_id !== user?.id),
    [activities, user?.id]
  )

  const displayedActivities = activeTab === 'yours'
    ? yourActivities
    : activeTab === 'others'
      ? otherActivities
      : activities

  const otherUnread = otherActivities.filter(
    a => !a.is_read && a.target_user_id === user?.id
  ).length

  const handleMarkAllAsRead = async () => {
    if (!user) return

    // Optimistically flip every cached row to read so the UI reflects the
    // change immediately (parity with useActivityFeed.markAllAsRead).
    const previous = queryClient.getQueryData<InfiniteData<ActivityFeedItemWithDetails[]>>(queryKey)
    queryClient.setQueryData<InfiniteData<ActivityFeedItemWithDetails[]>>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map(page => page.map(a => ({ ...a, is_read: true }))),
          }
        : old
    )

    try {
      const { error: updateError } = await supabase
        .from('activity_feed')
        .update({ is_read: true })
        .eq('target_user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        log.error('Error marking all activities as read', {
          component: 'ActivityPage',
          action: 'markAllAsRead',
          error: updateError,
        })
        if (previous) queryClient.setQueryData(queryKey, previous)
      }
    } catch (err) {
      log.error('Failed to mark all activities as read', { component: 'ActivityPage', action: 'markAllAsRead' }, err)
      if (previous) queryClient.setQueryData(queryKey, previous)
    }

    // Refetch from DB so the optimistic update is reconciled, then sync
    // the sidebar badge from the authoritative count.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      refreshCount(),
    ])
  }

  const tabs: { key: TabType; label: string; icon: typeof Bell; count?: number }[] = [
    { key: 'all', label: 'All', icon: Bell },
    { key: 'yours', label: 'Your Activity', icon: User },
    { key: 'others', label: 'Others', icon: Users, count: otherUnread },
  ]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-6 md:pt-8 pb-24 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="space-y-1">
          <p className="al-eyebrow">Inbox</p>
          <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
        </header>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold"
          >
            <BellOff className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors duration-200 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.key === 'all' ? 'All' : tab.key === 'yours' ? 'You' : 'Others'}
              </span>
              {tab.count != null && tab.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Activity Feed */}
      <div className="space-y-2">
        {displayedActivities.length > 0 && (
          <p className="al-eyebrow">Recent activity</p>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading && activities.length === 0 ? (
            <div className="p-12 text-center">
              <div
                className="inline-block h-8 w-8 rounded-full border-[3px] border-muted border-t-primary animate-spin"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground mt-3">Loading...</p>
            </div>
          ) : displayedActivities.length === 0 ? (
            <div className="p-6">
              <NoNotificationsEmptyState />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayedActivities.map((activity) => (
                <ActivityFeedItem
                  key={activity.id}
                  activity={activity}
                  // Only rows targeted at me are notifications I can mark read
                  // (RLS rejects is_read updates on anything else, so showing
                  // the unread dot there would make it reappear on revisit).
                  isUnread={!activity.is_read && activity.target_user_id === user?.id}
                  onMarkAsRead={(id) => {
                    markAsRead(id)
                    decrementCount()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {activities.length > 0 && lastPageFull && activeTab === 'all' && (
        <div className="text-center">
          <Button
            onClick={() => fetchNextPage()}
            variant="outline"
            disabled={isFetching}
            className="rounded-full"
          >
            {isFetching ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
