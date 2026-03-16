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
        "sticky top-0 z-50 w-full border-b backdrop-blur-xl",
        "bg-white/80 dark:bg-black/80 border-stone-200/30 dark:border-white/[0.06]"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="cursor-pointer">
          <span className="text-base sm:text-lg font-heading font-bold tracking-tight text-olive-800 dark:text-olive-200 truncate">
            Adventure Log
          </span>
        </Link>

        {/* Right: Actions */}
        <nav aria-label="User actions" className="flex items-center gap-1">
          <ThemeToggle />
          <NetworkStatusIndicator />
          <NotificationCenter />
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
