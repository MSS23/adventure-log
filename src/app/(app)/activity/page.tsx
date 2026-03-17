'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { useAuth } from '@/components/auth/AuthProvider'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { Bell, BellOff, User, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    fetchActivityFeed()
  }, [fetchActivityFeed])

  const unreadCount = activities.filter(a => !a.is_read).length

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

  const otherUnread = otherActivities.filter(a => !a.is_read).length

  const tabs: { key: TabType; label: string; icon: typeof Bell; count?: number }[] = [
    { key: 'all', label: 'All', icon: Bell },
    { key: 'yours', label: 'Your Activity', icon: User },
    { key: 'others', label: 'Others', icon: Users, count: otherUnread },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Activity
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-olive-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsRead()}
            variant="outline"
            size="sm"
            className="text-sm dark:border-stone-700 dark:text-stone-300"
          >
            <BellOff className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-stone-100 dark:bg-stone-800/50 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.key === 'all' ? 'All' : tab.key === 'yours' ? 'You' : 'Others'}
              </span>
              {tab.count != null && tab.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-olive-600 rounded-full px-1">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Activity Feed */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
        {isLoading && activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-3 border-olive-200 border-t-olive-600 animate-spin" />
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">Loading...</p>
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center mx-auto mb-3">
              {activeTab === 'yours' ? (
                <User className="h-8 w-8 text-olive-400" />
              ) : activeTab === 'others' ? (
                <Users className="h-8 w-8 text-olive-400" />
              ) : (
                <Bell className="h-8 w-8 text-olive-400" />
              )}
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              {activeTab === 'yours'
                ? 'No activity from you yet'
                : activeTab === 'others'
                  ? 'No activity from others yet'
                  : 'No activity yet'}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
              {activeTab === 'yours'
                ? 'Create albums, like posts, and follow travelers to see your activity here.'
                : activeTab === 'others'
                  ? 'When people interact with your content or create new albums, it\'ll show here.'
                  : 'When people you follow create albums or interact with your content, it\'ll show here.'}
            </p>
            {activeTab !== 'yours' && (
              <Link href="/explore">
                <Button className="mt-4 bg-olive-600 hover:bg-olive-700 text-white">
                  Discover People
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {displayedActivities.map((activity) => (
              <ActivityFeedItem
                key={activity.id}
                activity={activity}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {activities.length > 0 && activities.length % 30 === 0 && activeTab === 'all' && (
        <div className="mt-4 text-center">
          <Button
            onClick={() => fetchActivityFeed(30, activities.length)}
            variant="outline"
            disabled={isLoading}
            className="dark:border-stone-700 dark:text-stone-300"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}
