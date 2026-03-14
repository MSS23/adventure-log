'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Home,
  Globe,
  User,
  LogOut,
  BookOpen,
  Compass,
  BarChart3,
  Trophy,
  Bookmark,
  Bell,
  Star,
  Stamp,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { log } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

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
  { name: 'Wishlist', href: '/wishlist', icon: Star },
  { name: 'Activity', href: '/activity', icon: Bell },
]

const profileNavItems: NavItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Passport', href: '/passport', icon: Stamp },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
  { name: 'Saved', href: '/saved', icon: Bookmark },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)
  const prefersReducedMotion = useReducedMotion()

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
        <motion.div
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
            isActive
              ? "bg-olive-100/80 dark:bg-olive-900/25 text-olive-700 dark:text-olive-300"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-100/60 dark:hover:bg-white/[0.04] hover:text-stone-900 dark:hover:text-stone-200"
          )}
          whileHover={prefersReducedMotion ? {} : { x: 2 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Active indicator */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-olive-600 dark:bg-olive-400 rounded-r-full"
                initial={prefersReducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={prefersReducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </AnimatePresence>

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
        </motion.div>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-40 border-r border-stone-200/40 dark:border-white/[0.06]">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <motion.div
          className="px-5 py-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Link href="/feed" className="block">
            <span className="text-[22px] font-heading font-bold tracking-tight text-olive-800 dark:text-olive-200">
              Adventure Log
            </span>
          </Link>
        </motion.div>

        {/* Main Navigation */}
        <nav aria-label="Main navigation" className="px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600">
            Navigate
          </p>
          {mainNavItems.map((item, index) => (
            <motion.div
              key={item.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
            >
              {renderNavItem(item)}
            </motion.div>
          ))}
        </nav>

        {/* Profile Section */}
        <nav aria-label="Profile navigation" className="px-3 mt-6">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600">
            You
          </p>
          <div className="space-y-0.5">
            {profileNavItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
              >
                {renderNavItem(item)}
              </motion.div>
            ))}
          </div>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <motion.div
          className="px-3 py-4 border-t border-stone-100 dark:border-white/[0.06]"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <motion.button
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                "text-stone-500 hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-950/20 dark:hover:text-red-400",
                loggingOut && "opacity-50 cursor-not-allowed"
              )}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </aside>
  )
}
