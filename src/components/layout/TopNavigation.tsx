'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NetworkStatusIndicator } from '@/components/pwa/NetworkStatusIndicator'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'
import { cn } from '@/lib/utils'

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

export function TopNavigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        role="banner"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EDITORIAL_EASE }}
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-shadow duration-300',
          'bg-[color:var(--color-ivory)]/85 backdrop-blur-xl border-[color:var(--color-line-warm)]',
          // Fill the iOS status-bar / notch area in standalone PWA mode so the
          // header content isn't drawn under the Dynamic Island.
          'pt-[env(safe-area-inset-top)]',
          scrolled && 'shadow-[0_8px_24px_-12px_rgba(26,20,14,0.12)]',
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 mx-auto">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-7 h-7 rounded-lg bg-[color:var(--color-ink)] flex items-center justify-center text-[color:var(--color-ivory)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 010 18" />
              </svg>
            </motion.div>
            <span className="font-heading text-base sm:text-lg font-semibold text-[color:var(--color-ink)] truncate">
              Adventure Log
            </span>
          </Link>

          {/* Right: Actions */}
          <nav aria-label="User actions" className="flex items-center gap-1">
            <ThemeToggle />
            <NetworkStatusIndicator />
            <FeedbackLauncher variant="icon" label="Send feedback" />
            <NotificationCenter />
            <UserNav />
          </nav>
        </div>
      </motion.header>
    </MotionConfig>
  )
}
