'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Globe,
  Home,
  Compass,
  BookOpen,
  Bell,
  User,
  LogOut,
  Bookmark,
  UserPlus,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { log } from '@/lib/utils/logger'
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { useUnreadCount } from '@/components/activity/UnreadCountProvider'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const mainNavItems: NavItem[] = [
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Feed', href: '/feed', icon: Home },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'My Log', href: '/albums', icon: BookOpen },
  { name: 'Saved', href: '/saved', icon: Bookmark },
  { name: 'Activity', href: '/activity', icon: Bell },
]

const profileNavItems: NavItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const { unreadCount } = useUnreadCount()

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
    const isActive = pathname === item.href ||
      (item.href !== '/feed' && item.href !== '/profile' && pathname.startsWith(item.href))

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
            "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
            "hover:translate-x-0.5 active:scale-[0.98]",
            isActive
              ? "bg-olive-100/80 dark:bg-olive-900/25 text-olive-700 dark:text-olive-300"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-100/60 dark:hover:bg-white/[0.04] hover:text-stone-900 dark:hover:text-stone-200"
          )}
        >
          {isActive && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-olive-600 dark:bg-olive-400 rounded-r-full animate-scale-in"
            />
          )}

          <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200",
            isActive
              ? "text-olive-700 dark:text-olive-300"
              : "text-stone-500 dark:text-stone-500"
          )}>
            <Icon
              className="h-[18px] w-[18px]"
              strokeWidth={isActive ? 2.2 : 1.7}
            />
          </div>

          <span className={cn(
            "text-[13px] transition-all duration-200",
            isActive
              ? "font-semibold text-olive-800 dark:text-olive-200"
              : "font-medium"
          )}>
            {item.name}
          </span>

          {/* Unread badge for Activity */}
          {item.name === 'Activity' && unreadCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-olive-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-40 border-r border-stone-200/40 dark:border-white/[0.06] transition-[width] duration-300 ease-in-out">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-6 animate-fade-in">
          <Link href="/feed" className="block">
            <span className="text-[22px] font-heading font-bold tracking-tight text-olive-800 dark:text-olive-200">
              Adventure Log
            </span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav aria-label="Main navigation" className="px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600">
            Navigate
          </p>
          {mainNavItems.map((item) => (
            <div key={item.name}>
              {renderNavItem(item)}
            </div>
          ))}
        </nav>

        {/* Profile Section */}
        <nav aria-label="Profile navigation" className="px-3 mt-6">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600">
            You
          </p>
          <div className="space-y-0.5">
            {profileNavItems.map((item) => (
              <div key={item.name}>
                {renderNavItem(item)}
              </div>
            ))}
          </div>
        </nav>

        {/* Invite Friends */}
        <div className="px-3 mt-4">
          <button
            onClick={() => setShowInvite(true)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200",
              "bg-olive-50 dark:bg-olive-900/20 text-olive-700 dark:text-olive-300",
              "hover:bg-olive-100 dark:hover:bg-olive-900/30 active:scale-[0.98]",
              "border border-olive-200/60 dark:border-olive-800/40"
            )}
          >
            <UserPlus className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="text-[13px] font-medium">Invite Friends</span>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="px-3 py-4 border-t border-stone-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                "text-stone-500 hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-950/20 dark:hover:text-red-400",
                "active:scale-[0.97]",
                loggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

      {/* Invite Friends Dialog */}
      <InviteFriendsDialog isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </aside>
  )
}
