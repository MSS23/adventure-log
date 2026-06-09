'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Globe,
  Home,
  Compass,
  Bell,
  LogOut,
  Map as MapIcon,
  Settings,
  Book,
  ChevronRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { log } from '@/lib/utils/logger'
import { useUnreadCount } from '@/components/activity/UnreadCountProvider'
import { useAuth } from '@/components/auth/AuthProvider'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

const mainNavItems: NavItem[] = [
  { name: 'Feed', href: '/feed', icon: Home },
  { name: 'Home', href: '/dashboard', icon: Compass },
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Trips', href: '/trips', icon: MapIcon },
  { name: 'You', href: '/profile', icon: Book },
]

const bottomNavItems: NavItem[] = [
  { name: 'Activity', href: '/activity', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [loggingOut, setLoggingOut] = useState(false)
  const { unreadCount } = useUnreadCount()
  const { user, profile, signOut } = useAuth()

  const [countryCount, setCountryCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('albums')
          .select('country_code')
          .eq('user_id', user.id)
          .not('country_code', 'is', null)
        if (error || cancelled) return
        const unique = new Set((data || []).map((row) => row.country_code))
        if (!cancelled) setCountryCount(unique.size)
      } catch (error) {
        log.error('Country count fetch failed', { component: 'Sidebar' }, error as Error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Clerk's signOut handles its own post-logout redirect (configured via
      // ClerkProvider's `afterSignOutUrl`/middleware). The previous Supabase
      // implementation manually pushed to /login — that route is now a redirect
      // shim, so we delegate entirely to Clerk via AuthProvider.signOut.
      await signOut()
    } catch (error) {
      log.error('Error logging out', { component: 'Sidebar', action: 'logout' }, error as Error)
      setLoggingOut(false)
    }
  }

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

    const Icon = item.icon

    return (
      <motion.div
        key={item.name}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.4,
          ease: EDITORIAL_EASE,
          delay: 0.05 + index * 0.04,
        }}
      >
        <Link
          href={item.href}
          className="block relative"
          aria-current={isActive ? 'page' : undefined}
        >
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-[9px] rounded-xl transition-colors duration-200 group relative',
              'active:scale-[0.98]',
              isActive
                ? 'text-[color:var(--color-ink)]'
                : 'text-[color:var(--color-ink-soft)] hover:bg-white/60 dark:hover:bg-white/[0.04]',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-active-pill"
                className="absolute inset-0 rounded-xl bg-white dark:bg-white/[0.04] shadow-[0_1px_2px_rgba(26,20,14,0.04),inset_0_0_0_1px_var(--color-line-warm)]"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                aria-hidden
              />
            )}

            <div
              className={cn(
                'relative flex items-center justify-center w-[18px] h-[18px] transition-colors duration-200',
                isActive
                  ? 'text-[color:var(--color-forest)]'
                  : 'text-[color:var(--color-ink-soft)]',
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </div>

            <span
              className={cn(
                'relative text-[14px] transition-all duration-200',
                isActive ? 'font-semibold' : 'font-medium',
              )}
            >
              {item.name}
            </span>

            {item.name === 'Activity' && (
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className="relative ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-[color:var(--color-coral)] rounded-full shadow-[0_2px_6px_rgba(226,85,58,0.35)]"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </div>
        </Link>
      </motion.div>
    )
  }

  const displayName = profile?.display_name || profile?.username || 'Explorer'
  const initials =
    displayName
      .split(' ')
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'U'

  return (
    <MotionConfig reducedMotion="user">
      <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-[color:var(--color-ivory)] z-40 border-r border-[color:var(--color-line-warm)]">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <motion.div
            className="px-5 py-6"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
          >
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="w-[30px] h-[30px] rounded-[9px] bg-[color:var(--color-forest)] flex items-center justify-center text-[color:var(--color-ivory)]"
              >
                <svg
                  width="16"
                  height="16"
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
              <div className="leading-none">
                <div className="font-heading text-[17px] font-semibold text-[color:var(--color-ink)] leading-none">
                  Adventure Log
                </div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--color-muted-warm)] mt-1">
                  est. 2025
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Main navigation */}
          <nav aria-label="Main navigation" className="px-3 space-y-0.5">
            {mainNavItems.map((item, i) => renderNavItem(item, i))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom navigation */}
          <nav aria-label="Secondary navigation" className="px-3 space-y-0.5 pb-3">
            {bottomNavItems.map((item, i) => renderNavItem(item, mainNavItems.length + i))}
          </nav>

          {/* User card */}
          {user && (
            <motion.div
              className="px-3 pb-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EDITORIAL_EASE, delay: 0.35 }}
            >
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-[color:var(--color-ivory-alt)] hover:shadow-[0_4px_16px_rgba(26,20,14,0.06)] transition-shadow group"
              >
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold bg-[color:var(--color-coral)] shadow-[0_4px_12px_rgba(226,85,58,0.25)]"
                  aria-hidden
                >
                  {initials}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[color:var(--color-ink)] truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-[color:var(--color-muted-warm)]">
                    {countryCount === null
                      ? '...'
                      : `${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`}
                  </div>
                </div>
                <ChevronRight
                  className="h-[14px] w-[14px] text-[color:var(--color-muted-warm)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--color-forest)]"
                  strokeWidth={1.8}
                />
              </Link>
            </motion.div>
          )}

          {/* Footer utilities */}
          <div className="px-3 py-3 border-t border-[color:var(--color-line-warm)]">
            <div className="flex items-center justify-between px-1">
              <ThemeToggle />
              <motion.button
                onClick={handleLogout}
                disabled={loggingOut}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200',
                  'text-[color:var(--color-muted-warm)] hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/15 dark:hover:text-red-300',
                  loggingOut && 'opacity-50 cursor-not-allowed',
                )}
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </motion.button>
            </div>
          </div>
        </div>
      </aside>
    </MotionConfig>
  )
}
