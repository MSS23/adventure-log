'use client'

import Link from 'next/link'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NetworkStatusIndicator } from '@/components/pwa/NetworkStatusIndicator'
import { cn } from '@/lib/utils'

export function TopNavigation() {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm",
      "border-gray-200"
    )}>
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              Adventure Log
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Network status indicator */}
          <NetworkStatusIndicator />

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <UserNav />
        </div>
      </div>
    </header>
  )
}
