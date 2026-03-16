'use client'

import { useEffect } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { Bell, BellOff } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ActivityPage() {
  const {
    activities,
    isLoading,
    fetchActivityFeed,
    markAsRead,
    markAllAsRead
  } = useActivityFeed()

  useEffect(() => {
    fetchActivityFeed()
  }, [fetchActivityFeed])

  const unreadCount = activities.filter(a => !a.is_read).length

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
          {unreadCount > 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {unreadCount} unread
            </p>
          )}
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

      {/* Activity Feed */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
        {isLoading && activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-3 border-olive-200 border-t-olive-600 animate-spin" />
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">Loading...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-8 w-8 text-olive-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              No activity yet
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
              When people you follow create albums or interact with your content, it&apos;ll show here.
            </p>
            <Link href="/explore">
              <Button className="mt-4 bg-olive-600 hover:bg-olive-700 text-white">
                Discover People
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {activities.map((activity) => (
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
      {activities.length > 0 && activities.length % 30 === 0 && (
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
