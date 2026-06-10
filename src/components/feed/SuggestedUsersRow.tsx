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
      <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/60">
        <Link href={`/u/${user.username}`}>
          <OptimizedAvatar
            src={user.avatar_url || undefined}
            alt={user.display_name || user.username}
            fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
            size="sm"
            className="ring-1 ring-border"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/u/${user.username}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block">
            {user.display_name || user.username}
          </Link>
          <p className="text-xs text-muted-foreground">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
        </div>
        <FollowButton userId={user.id} size="sm" showText={true} />
      </div>
    )
  }

  // Vertical card for mobile scrollable row
  return (
    <div
      className="flex-shrink-0 w-36 rounded-2xl border border-border bg-card p-3 text-center cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
    >
      <Link href={`/u/${user.username}`} className="block">
        <OptimizedAvatar
          src={user.avatar_url || undefined}
          alt={user.display_name || user.username}
          fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
          size="lg"
          className="mx-auto mb-2 ring-2 ring-primary/20"
        />
        <p className="text-sm font-semibold text-foreground truncate">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-muted-foreground mb-2">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
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
        <p className="al-eyebrow">Suggested travelers</p>
        <Link href="/explore" className="text-xs font-semibold text-primary hover:underline cursor-pointer transition-colors duration-200">See all</Link>
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
