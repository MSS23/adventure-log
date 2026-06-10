'use client'

import { SuggestedUsers } from '@/components/feed/SuggestedUsers'
import { ActivityFeed } from '@/components/feed/ActivityFeed'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { useAuth } from '@/components/auth/AuthProvider'

export function FeedSidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden lg:flex lg:w-[280px] xl:w-[320px] flex-col fixed right-0 top-0 bottom-0 bg-card z-30 border-l border-border">
      <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading text-base font-semibold text-foreground">Discover</h2>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 space-y-6">
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
