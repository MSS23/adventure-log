'use client'

import Link from 'next/link'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { SuggestedUsers } from '@/components/social/SuggestedUsers'
import { useAuth } from '@/components/auth/AuthProvider'

export function SuggestionsSidebar() {
  const { user, profile } = useAuth()

  if (!user || !profile) return null

  return (
    <aside className="hidden xl:flex xl:w-[320px] flex-col fixed right-0 top-0 bottom-0 pt-8 z-30 bg-white">
      <div className="px-6 py-4 space-y-6 overflow-y-auto scrollbar-hide h-full">
        {/* User Profile Card */}
        <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.display_name}
            fallback={profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U'}
            size="lg"
            className=""
            priority
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {profile.username}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {profile.display_name}
            </p>
          </div>
        </Link>

        {/* Suggestions for You */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500">
              Suggestions for You
            </h3>
            <Link
              href="/search?mode=suggested"
              className="text-xs font-semibold text-gray-900 hover:text-gray-700"
            >
              See All
            </Link>
          </div>

          <SuggestedUsers currentUserId={user?.id} />
        </div>

        {/* Footer Links */}
        <div className="pt-4">
          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-3">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            © 2025 ADVENTURE LOG
          </p>
        </div>
      </div>
    </aside>
  )
}
