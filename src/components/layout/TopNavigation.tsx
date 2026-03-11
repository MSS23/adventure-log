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
        "sticky top-0 z-50 w-full border-b backdrop-blur-md",
        "bg-[#FAFAF8]/90 dark:bg-[#1A1714]/90 border-stone-200/60 dark:border-white/[0.08]/40"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-olive-600 to-olive-500 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tight">AL</span>
            </div>
            <span className="text-lg font-heading font-bold text-stone-900 dark:text-stone-100">
              Adventure Log
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <nav aria-label="User actions" className="flex items-center gap-2">
          <ThemeToggle />
          <NetworkStatusIndicator />
          <NotificationCenter />
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
