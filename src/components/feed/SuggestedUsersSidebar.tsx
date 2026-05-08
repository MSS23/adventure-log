'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Globe, Camera } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { SuggestedUserCard } from '@/components/feed/SuggestedUsersRow'
import type { SuggestedUser } from '@/app/(app)/feed/useFeedPageData'

// Suggested Users Sidebar - Desktop
export const SuggestedUsersSidebar = memo(({ users }: { users: SuggestedUser[] }) => {
  if (users.length === 0) return null

  return (
    <div className="hidden xl:block w-72 flex-shrink-0">
      <div className="sticky top-20">
        <GlassCard variant="elevated" padding="md" className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Suggested for You</h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-white/5">
            {users.map(user => (
              <SuggestedUserCard key={user.id} user={user} variant="horizontal" />
            ))}
          </div>
        </GlassCard>

        {/* Quick links */}
        <div className="px-2 space-y-2">
          <Link
            href="/globe"
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-olive-600 transition-colors duration-200 cursor-pointer py-1"
          >
            <Globe className="w-3.5 h-3.5" />
            Explore the Globe
          </Link>
          <Link
            href="/albums/new"
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-olive-600 transition-colors duration-200 cursor-pointer py-1"
          >
            <Camera className="w-3.5 h-3.5" />
            Create an Album
          </Link>
        </div>
      </div>
    </div>
  )
})

SuggestedUsersSidebar.displayName = 'SuggestedUsersSidebar'
