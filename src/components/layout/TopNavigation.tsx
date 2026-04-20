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
        "sticky top-0 z-50 w-full border-b",
        "bg-[color:var(--color-ivory)]/90 backdrop-blur-xl border-[color:var(--color-line-warm)]"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 mx-auto">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[color:var(--color-ink)] flex items-center justify-center text-[color:var(--color-ivory)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3a14 14 0 010 18"/>
            </svg>
          </div>
          <span className="font-heading text-base sm:text-lg font-semibold text-[color:var(--color-ink)] truncate">
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
