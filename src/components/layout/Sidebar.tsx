'use client'

import { usePathname, useRouter } from 'next/navigation'
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

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

// Simplified to 5 destinations — everything else lives as a tab or submenu
// inside one of these. Nothing is removed, just not screaming from the nav.
const mainNavItems: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Trips', href: '/trips', icon: MapIcon },
  { name: 'Feed', href: '/feed', icon: Compass },
  { name: 'You', href: '/profile', icon: Book },
]

const bottomNavItems: NavItem[] = [
  { name: 'Activity', href: '/activity', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loggingOut, setLoggingOut] = useState(false)
  const { unreadCount } = useUnreadCount()
  const { user, profile } = useAuth()

  // Country count for the user footer card
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
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      log.error('Error logging out', { component: 'Sidebar', action: 'logout' }, error as Error)
      setLoggingOut(false)
    }
  }

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

    const Icon = item.icon

    return (
      <Link
        key={item.name}
        href={item.href}
        className="block relative"
        aria-current={isActive ? 'page' : undefined}
      >
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-[9px] rounded-xl transition-all duration-200 group relative',
            'active:scale-[0.98]',
            isActive
              ? 'bg-white dark:bg-white/[0.03] text-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(26,20,14,0.04),inset_0_0_0_1px_var(--color-line-warm)]'
              : 'text-[color:var(--color-ink-soft)] hover:bg-white/60 dark:hover:bg-white/[0.04]'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center w-[18px] h-[18px] transition-colors duration-200',
              isActive ? 'text-[color:var(--color-coral)]' : 'text-[color:var(--color-muted-warm)]'
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </div>

          <span
            className={cn(
              'text-[14px] transition-all duration-200',
              isActive ? 'font-semibold' : 'font-medium'
            )}
          >
            {item.name}
          </span>

          {item.name === 'Activity' && unreadCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-[color:var(--color-coral)] rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </Link>
    )
  }

  const displayName = profile?.display_name || profile?.username || 'Explorer'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || 'U'

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-[color:var(--color-ivory)] z-40 border-r border-[color:var(--color-line-warm)]">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-[9px] bg-[color:var(--color-ink)] flex items-center justify-center text-[color:var(--color-ivory)]">
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
            </div>
            <div className="leading-none">
              <div className="font-heading text-[17px] font-semibold text-[color:var(--color-ink)] leading-none">
                Adventure Log
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--color-muted-warm)] mt-1">
                est. 2025
              </div>
            </div>
          </Link>
        </div>

        {/* Main navigation */}
        <nav aria-label="Main navigation" className="px-3 space-y-0.5">
          {mainNavItems.map((item) => (
            <div key={item.name}>{renderNavItem(item)}</div>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom navigation */}
        <nav aria-label="Secondary navigation" className="px-3 space-y-0.5 pb-3">
          {bottomNavItems.map((item) => (
            <div key={item.name}>{renderNavItem(item)}</div>
          ))}
        </nav>

        {/* User card */}
        {user && (
          <div className="px-3 pb-3">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-[color:var(--color-ivory-alt)] hover:shadow-[0_4px_16px_rgba(26,20,14,0.06)] transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold bg-[color:var(--color-coral)]"
                aria-hidden
              >
                {initials}
              </div>
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
                className="h-[14px] w-[14px] text-[color:var(--color-muted-warm)]"
                strokeWidth={1.8}
              />
            </Link>
          </div>
        )}

        {/* Footer utilities */}
        <div className="px-3 py-3 border-t border-[color:var(--color-line-warm)]">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                'text-[color:var(--color-muted-warm)] hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-950/20 dark:hover:text-red-400',
                'active:scale-[0.97]',
                loggingOut && 'opacity-50 cursor-not-allowed'
              )}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
