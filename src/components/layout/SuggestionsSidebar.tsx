'use client'

import Link from 'next/link'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { SuggestedUsers } from '@/components/social/SuggestedUsers'
import { useAuth } from '@/components/auth/AuthProvider'

export function SuggestionsSidebar() {
  const { user, profile } = useAuth()

  if (!user || !profile) return null

  return (
    <aside className="hidden xl:flex xl:w-[320px] flex-col fixed right-0 top-0 h-screen pt-20 z-30 border-l border-white/10 bg-[#0A1F1F]">
      <div className="px-6 py-4 space-y-6 overflow-y-auto scrollbar-hide">
        {/* User Profile Card */}
        <Link href="/profile" className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.display_name}
            fallback={profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U'}
            size="xl"
            className="ring-2 ring-teal-500/30"
            priority
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {profile.username}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {profile.display_name}
            </p>
          </div>
        </Link>

        {/* Suggestions for You */}
        <div className="bg-[#1A2F2F] rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400">
              Suggestions for you
            </h3>
            <Link
              href="/search?mode=suggested"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300"
            >
              See All
            </Link>
          </div>

          <SuggestedUsers currentUserId={user?.id} />
        </div>

        {/* Footer Links */}
        <div className="px-4">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
            <Link href="/privacy" className="hover:underline hover:text-gray-400">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline hover:text-gray-400">
              Terms
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:underline hover:text-gray-400">
              Settings
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            © 2025 ADVENTURE LOG
          </p>
        </div>
      </div>
    </aside>
  )
}
