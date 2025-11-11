'use client'

import { SuggestedUsers } from '@/components/feed/SuggestedUsers'
import { ActivityFeed } from '@/components/feed/ActivityFeed'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { useAuth } from '@/components/auth/AuthProvider'

export function FeedSidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden lg:flex lg:w-[280px] xl:w-[320px] flex-col fixed right-0 top-0 bottom-0 bg-white z-30 border-l border-gray-200">
      <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Discover</h2>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 space-y-5">
          {/* Streak Tracker */}
          <StreakTracker />

          {/* Suggested Users */}
          <SuggestedUsers />

          {/* Live Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </aside>
  )
}
