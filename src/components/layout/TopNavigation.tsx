'use client'

import Link from 'next/link'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NetworkStatusIndicator } from '@/components/pwa/NetworkStatusIndicator'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

export function TopNavigation() {
  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur-sm",
        "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Adventure Log
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <nav aria-label="User actions" className="flex items-center gap-3">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Network status indicator */}
          <NetworkStatusIndicator />

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
