'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { useAuth } from '@/components/auth/AuthProvider'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { Bell, BellOff, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NoNotificationsEmptyState } from '@/components/ui/enhanced-empty-state'
import { useUnreadCount } from '@/components/activity/UnreadCountProvider'

type TabType = 'all' | 'yours' | 'others'

export default function ActivityPage() {
  const { user } = useAuth()
  const {
    activities,
    isLoading,
    fetchActivityFeed,
    markAsRead,
    markAllAsRead
  } = useActivityFeed()

  const { refreshCount, decrementCount } = useUnreadCount()
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    fetchActivityFeed()
  }, [fetchActivityFeed])

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
    await markAllAsRead()
    // Refetch from DB so the optimistic update is reconciled, then sync
    // the sidebar badge from the authoritative count.
    await Promise.all([fetchActivityFeed(), refreshCount()])
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
            Activity
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
          <p className="al-eyebrow">Today</p>
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

      {activities.length > 0 && activities.length % 30 === 0 && activeTab === 'all' && (
        <div className="text-center">
          <Button
            onClick={() => fetchActivityFeed(30, activities.length)}
            variant="outline"
            disabled={isLoading}
            className="rounded-full"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
