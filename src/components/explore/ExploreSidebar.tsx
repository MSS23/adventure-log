'use client'

import { SuggestedUsers } from '@/components/feed/SuggestedUsers'
import { useAuth } from '@/components/auth/AuthProvider'

export function ExploreSidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden lg:flex lg:w-[280px] xl:w-[340px] flex-col fixed right-0 top-0 h-screen bg-white z-30 border-l border-gray-100">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
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
