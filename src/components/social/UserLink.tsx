'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { User } from '@/types/database'
import { useAuth } from '@/components/auth/AuthProvider'

// Partial user type for cases where we only have minimal user data
type PartialUser = Pick<User, 'id' | 'username'> & Partial<Omit<User, 'id' | 'username'>>

interface UserLinkProps {
  user: User | PartialUser | null | undefined
  className?: string
  showUsername?: boolean
  showDisplayName?: boolean
  children?: React.ReactNode
}

/**
 * Reusable component for clickable usernames/display names
 * Navigates to user's profile page based on their privacy settings
 */
export function UserLink({
  user,
  className,
  showUsername = false,
  showDisplayName = true,
  children
}: UserLinkProps) {
  const { user: currentUser } = useAuth()

  if (!user) {
    return <span className={className}>{children || 'Unknown User'}</span>
  }

  const displayText = children || (
    showDisplayName
      ? user.display_name || user.username || 'Anonymous'
      : showUsername
        ? `@${user.username}`
        : user.display_name || user.username || 'Anonymous'
  )

  // Check if username is a generated placeholder (user_XXXXXXXX pattern)
  const isGeneratedUsername = user.username && /^user_[0-9a-f]{8}$/i.test(user.username)

  // Check if this is the current user viewing their own link
  const isCurrentUser = currentUser?.id === user.id

  // Allow current user to access their own profile even with generated username
  // For other users with generated usernames, don't create clickable links
  if (isGeneratedUsername && !isCurrentUser) {
    return <span className={className}>{displayText}</span>
  }

  // Validate username and id - don't create link if invalid
  const profilePath = user.username && user.username !== 'user'
    ? user.username
    : user.id

  // If no valid profile path, render as plain text
  if (!profilePath || profilePath === 'user') {
    return <span className={className}>{displayText}</span>
  }

  // Link to profile page - the profile page will handle privacy-based content display
  return (
    <Link
      href={`/profile/${profilePath}`}
      className={cn(
        'hover:underline transition-all',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {displayText}
    </Link>
  )
}

interface UserAvatarLinkProps {
  user: User | PartialUser | null | undefined
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper component for clickable avatars
 */
export function UserAvatarLink({ user, children, className }: UserAvatarLinkProps) {
  const { user: currentUser } = useAuth()

  if (!user) {
    return <div className={className}>{children}</div>
  }

  // Check if username is a generated placeholder (user_XXXXXXXX pattern)
  const isGeneratedUsername = user.username && /^user_[0-9a-f]{8}$/i.test(user.username)

  // Check if this is the current user viewing their own link
  const isCurrentUser = currentUser?.id === user.id

  // Allow current user to access their own profile even with generated username
  // For other users with generated usernames, don't create clickable links
  if (isGeneratedUsername && !isCurrentUser) {
    return <div className={className}>{children}</div>
  }

  // Validate username and id - don't create link if invalid
  const profilePath = user.username && user.username !== 'user'
    ? user.username
    : user.id

  // If no valid profile path, render without link
  if (!profilePath || profilePath === 'user') {
    return <div className={className}>{children}</div>
  }

  return (
    <Link
      href={`/profile/${profilePath}`}
      className={cn('transition-opacity hover:opacity-80', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  )
}
