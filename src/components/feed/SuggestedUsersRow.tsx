'use client'

import { memo } from 'react'
import Link from 'next/link'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { FollowButton } from '@/components/social/FollowButton'
import type { SuggestedUser } from '@/app/(app)/feed/useFeedPageData'

// Suggested user card (compact, for sidebar/row)
export const SuggestedUserCard = memo(({ user, variant = 'vertical' }: { user: SuggestedUser; variant?: 'vertical' | 'horizontal' }) => {
  if (variant === 'horizontal') {
    return (
      <div className="flex items-center gap-3 py-2 hover:bg-stone-50 dark:hover:bg-white/[0.03] -mx-1 px-1 rounded-lg transition-colors duration-200">
        <Link href={`/u/${user.username}`}>
          <OptimizedAvatar
            src={user.avatar_url || undefined}
            alt={user.display_name || user.username}
            fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
            size="sm"
            className="ring-1 ring-stone-200"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/u/${user.username}`} className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-olive-600 transition-colors truncate block">
            {user.display_name || user.username}
          </Link>
          <p className="text-xs text-stone-500">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
        </div>
        <FollowButton userId={user.id} size="sm" showText={true} />
      </div>
    )
  }

  // Vertical card for mobile scrollable row
  return (
    <div className="flex-shrink-0 w-36 bg-white dark:bg-[#111111] rounded-xl border border-stone-200/50 dark:border-white/10 p-3 text-center cursor-pointer hover:shadow-md hover:border-olive-200 dark:hover:border-olive-800/40 transition-all duration-200">
      <Link href={`/u/${user.username}`} className="block">
        <OptimizedAvatar
          src={user.avatar_url || undefined}
          alt={user.display_name || user.username}
          fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
          size="lg"
          className="mx-auto mb-2 ring-2 ring-olive-100 dark:ring-olive-900/30"
        />
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-stone-500 mb-2">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
      </Link>
      <FollowButton userId={user.id} size="sm" showText={true} className="w-full" />
    </div>
  )
})

SuggestedUserCard.displayName = 'SuggestedUserCard'

// Suggested Users Section - Mobile horizontal row
export const SuggestedUsersRow = memo(({ users }: { users: SuggestedUser[] }) => {
  if (users.length === 0) return null

  return (
    <div className="mb-4 xl:hidden">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Suggested Travelers</h3>
        <Link href="/explore" className="text-xs text-olive-600 hover:text-olive-700 font-medium cursor-pointer transition-colors duration-200">See All</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {users.map(user => (
          <SuggestedUserCard key={user.id} user={user} variant="vertical" />
        ))}
      </div>
    </div>
  )
})

SuggestedUsersRow.displayName = 'SuggestedUsersRow'
