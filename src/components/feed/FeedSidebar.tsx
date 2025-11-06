'use client'

import { ActivityFeed } from '@/components/feed/ActivityFeed'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { useAuth } from '@/components/auth/AuthProvider'

export function FeedSidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden xl:flex xl:w-[340px] flex-col fixed right-0 top-0 h-screen bg-gray-50 z-30 border-l border-gray-100">
      <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
        {/* Streak Tracker */}
        <StreakTracker />

        {/* Live Activity Feed */}
        <ActivityFeed />
      </div>
    </aside>
  )
}
