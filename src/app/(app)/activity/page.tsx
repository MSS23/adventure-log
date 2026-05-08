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
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 sm:pt-8">
      {/* Editorial header */}
      <div className="mb-6">
        <p className="al-eyebrow mb-1">Inbox</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
            Activity
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-[11px] font-bold text-white rounded-full"
                style={{ background: 'var(--color-coral)' }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
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
      </div>

      {/* Filter chips — editorial pill group */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors border',
                isActive
                  ? 'bg-[color:var(--color-ink)] text-[color:var(--color-ivory)] border-[color:var(--color-ink)]'
                  : 'bg-[color:var(--card)] text-[color:var(--color-ink-soft)] border-[color:var(--color-line-warm)] hover:bg-[color:var(--color-ivory-alt)]'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.key === 'all' ? 'All' : tab.key === 'yours' ? 'You' : 'Others'}
              </span>
              {tab.count != null && tab.count > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[16px] h-[16px] text-[10px] font-bold text-white rounded-full px-1"
                  style={{ background: 'var(--color-coral)' }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Today eyebrow */}
      {displayedActivities.length > 0 && (
        <p className="al-eyebrow mb-2">Today</p>
      )}

      {/* Activity Feed */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--color-line-warm)',
          boxShadow: '0 1px 2px rgba(26,20,14,0.04), 0 4px 16px rgba(26,20,14,0.06)',
        }}
      >
        {isLoading && activities.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="inline-block h-8 w-8 rounded-full border-[3px] animate-spin"
              style={{
                borderColor: 'var(--color-coral-tint)',
                borderTopColor: 'var(--color-coral)',
              }}
            />
            <p className="text-sm text-[color:var(--color-muted-warm)] mt-3">Loading...</p>
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="p-6">
            <NoNotificationsEmptyState />
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--color-line-warm)]">
            {displayedActivities.map((activity) => (
              <ActivityFeedItem
                key={activity.id}
                activity={activity}
                onMarkAsRead={(id) => {
                  markAsRead(id)
                  if (!activity.is_read) decrementCount()
                }}
              />
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && activities.length % 30 === 0 && activeTab === 'all' && (
        <div className="mt-4 text-center">
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
