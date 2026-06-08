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
      <div className="absolute z-50 w-64 mt-1 bg-white dark:bg-[#1B170E] border border-stone-200 dark:border-white/[0.10] rounded-lg shadow-lg py-2">
        <div className="px-4 py-2 text-sm text-stone-500 dark:text-stone-400">
          Searching users...
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return null
  }

  return (
    <div className="absolute z-50 w-64 mt-1 bg-white dark:bg-[#1B170E] border border-stone-200 dark:border-white/[0.10] rounded-lg shadow-lg py-2 max-h-60 overflow-y-auto">
      {users.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user)}
          className={`
            w-full px-4 py-2 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-white/[0.06] transition-colors
            ${index === selectedIndex ? 'bg-olive-50 dark:bg-olive-950/20' : ''}
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
            <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-white/[0.08] flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-stone-400 dark:text-stone-500" />
            </div>
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {user.display_name || user.username}
            </span>
            {user.display_name && user.username && (
              <span className="text-xs text-stone-500 dark:text-stone-400">
                @{user.username}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
