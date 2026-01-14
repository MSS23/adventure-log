'use client'

/**
 * Activity Feed Page
 *
 * Display social activity feed for the current user
 */

import { useEffect } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const unreadCount = activities.filter(a => !a.is_read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              )}
            </div>
          </div>

          {/* Mark all as read button */}
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading && activities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
              <p className="text-sm text-gray-500 mt-4">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No activity yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When people you follow create albums, like your content, or mention you,
                you&apos;ll see it here.
              </p>
              <Link href="/explore">
                <Button className="mt-6 bg-teal-600 hover:bg-teal-700">
                  Discover People
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activities.map(activity => (
                <ActivityFeedItem
                  key={activity.id}
                  activity={activity}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Load More (Optional) */}
        {activities.length > 0 && activities.length % 30 === 0 && (
          <div className="mt-6 text-center">
            <Button
              onClick={() => fetchActivityFeed(30, activities.length)}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
