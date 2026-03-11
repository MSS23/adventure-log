'use client'

import Link from 'next/link'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NetworkStatusIndicator } from '@/components/pwa/NetworkStatusIndicator'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import { Compass } from 'lucide-react'

export function TopNavigation() {
  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur-xl",
        "bg-[#F5F7F0]/80 dark:bg-black/80 border-olive-200/40 dark:border-white/[0.06]"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-olive-700 rounded-xl flex items-center justify-center">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-olive-900 dark:text-olive-100">
              Adventure Log
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <nav aria-label="User actions" className="flex items-center gap-1.5">
          <ThemeToggle />
          <NetworkStatusIndicator />
          <NotificationCenter />
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
