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
  Map,
  MessageCircle,
  MapPin,
  PenLine,
  Users,
} from 'lucide-react'
import { StoriesSection } from '@/components/feed/StoriesSection'
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
  activeIcon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const mainNavItems: NavItem[] = [
  {
    name: 'Feed',
    href: '/feed',
    icon: Home,
  },
  {
    name: 'Explore',
    href: '/explore',
    icon: Compass,
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
  },
  {
    name: 'Activity',
    href: '/activity',
    icon: Bell,
  },
  {
    name: 'Globe',
    href: '/globe',
    icon: Globe,
  },
  {
    name: 'My Log',
    href: '/albums',
    icon: BookOpen,
  },
  {
    name: 'Journal',
    href: '/journal',
    icon: PenLine,
  },
  {
    name: 'Itineraries',
    href: '/itineraries',
    icon: Map,
  },
]

const profileNavItems: NavItem[] = [
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    name: 'Check-ins',
    href: '/check-ins',
    icon: MapPin,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Companions',
    href: '/companions',
    icon: Users,
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Trophy,
  },
  {
    name: 'Saved',
    href: '/saved',
    icon: Bookmark,
  },
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

  // Render a nav item with animation
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
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
            isActive
              ? "bg-gradient-to-r from-olive-50 to-olive-50 dark:from-olive-900/30 dark:to-olive-900/30 text-olive-600 dark:text-olive-400"
              : "text-stone-700 dark:text-stone-300 hover:bg-stone-50/80 dark:hover:bg-stone-800/50"
          )}
          whileHover={prefersReducedMotion ? {} : { x: 4, scale: 1.01 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Active indicator bar */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-olive-500 to-olive-500 rounded-r-full"
                initial={prefersReducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={prefersReducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </AnimatePresence>

          <motion.div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              isActive
                ? "bg-gradient-to-br from-olive-100 to-olive-100"
                : "bg-transparent group-hover:bg-stone-100"
            )}
            whileHover={prefersReducedMotion ? {} : { rotate: isActive ? 0 : 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] transition-all duration-200",
                isActive
                  ? "text-olive-600 dark:text-olive-400"
                  : "text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200"
              )}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
          </motion.div>

          <span className={cn(
            "text-sm transition-all duration-200",
            isActive
              ? "font-semibold text-olive-700 dark:text-olive-300"
              : "font-medium group-hover:text-stone-900 dark:group-hover:text-stone-100"
          )}>
            {item.name}
          </span>

          {/* Subtle glow effect on active */}
          {isActive && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-olive-200/20 to-olive-200/20 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-[#F5F7F0] dark:bg-[#000000] z-40 border-r border-stone-200/60 dark:border-white/[0.08]/50">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Logo */}
        <motion.div
          className="px-4 py-5 border-b border-stone-100 dark:border-white/[0.08]"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Link href="/feed" className="block">
            <motion.span
              className="text-xl font-heading font-bold bg-gradient-to-r from-olive-700 to-olive-600 bg-clip-text text-transparent dark:from-olive-400 dark:to-olive-400"
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Adventure Log
            </motion.span>
          </Link>
        </motion.div>

        {/* Main Navigation */}
        <nav aria-label="Main navigation" className="px-3 py-4 space-y-1">
          {mainNavItems.map((item, index) => (
            <motion.div
              key={item.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
            >
              {renderNavItem(item)}
            </motion.div>
          ))}
        </nav>

        {/* Profile Section */}
        <nav aria-label="Profile navigation" className="px-3 pb-4">
          <motion.div
            className="border-t border-stone-200/80 dark:border-white/[0.08] pt-4 space-y-1"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {profileNavItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              >
                {renderNavItem(item)}
              </motion.div>
            ))}
          </motion.div>
        </nav>

        {/* Stories Section */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <StoriesSection />
        </div>

        {/* Theme Toggle & Logout at Bottom */}
        <motion.div
          className="px-3 py-3 border-t border-stone-100 dark:border-white/[0.08] mt-auto bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group w-full text-left",
              "hover:bg-red-50/80",
              loggingOut && "opacity-50 cursor-not-allowed"
            )}
            whileHover={prefersReducedMotion ? {} : { x: 4, scale: 1.01 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <motion.div
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent group-hover:bg-red-100/80 transition-all duration-200"
              whileHover={prefersReducedMotion ? {} : { rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <LogOut
                className="h-[18px] w-[18px] text-stone-500 group-hover:text-red-600 transition-colors"
                strokeWidth={1.8}
              />
            </motion.div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </motion.button>

          <div className="mt-2 flex items-center justify-center">
            <ThemeToggle />
          </div>
        </motion.div>
      </div>
    </aside>
  )
}
