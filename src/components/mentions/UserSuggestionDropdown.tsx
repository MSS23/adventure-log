'use client'

/**
 * UserSuggestionDropdown Component
 *
 * Dropdown showing user suggestions for @mentions
 */

import { User } from '@/types/database'
import { UserCircle } from 'lucide-react'
import Image from 'next/image'

interface UserSuggestionDropdownProps {
  users: User[]
  onSelectUser: (user: User) => void
  selectedIndex: number
  isLoading?: boolean
}

export function UserSuggestionDropdown({
  users,
  onSelectUser,
  selectedIndex,
  isLoading = false
}: UserSuggestionDropdownProps) {
  if (isLoading) {
    return (
      <div className="absolute z-50 w-64 mt-1 rounded-xl border border-border bg-card shadow-md py-2">
        <div className="px-4 py-2 text-sm text-muted-foreground">
          Searching users...
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return null
  }

  return (
    <div className="absolute z-50 w-64 mt-1 rounded-xl border border-border bg-card shadow-md py-2 max-h-60 overflow-y-auto">
      {users.map((user, index) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelectUser(user)}
          className={`
            w-full px-4 py-2 flex items-center gap-3 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50
            ${index === selectedIndex ? 'bg-primary/10' : ''}
          `}
        >
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.display_name || user.username || ''}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-foreground">
              {user.display_name || user.username}
            </span>
            {user.display_name && user.username && (
              <span className="text-xs text-muted-foreground">
                @{user.username}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
