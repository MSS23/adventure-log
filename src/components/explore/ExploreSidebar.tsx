'use client'

import { SuggestedUsers } from '@/components/feed/SuggestedUsers'
import { useAuth } from '@/components/auth/AuthProvider'

export function ExploreSidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden lg:flex lg:w-[280px] xl:w-[340px] flex-col fixed right-0 top-0 bottom-0 bg-card z-30 border-l border-border">
      <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Suggested for you
          </h2>
        </div>

        {/* Suggested Users Section */}
        <div className="p-4 lg:p-6">
          <SuggestedUsers />
        </div>
      </div>
    </aside>
  )
}
