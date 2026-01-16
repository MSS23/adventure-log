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
  Map
} from 'lucide-react'
import { StoriesSection } from '@/components/feed/StoriesSection'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
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
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
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
      console.error('Error logging out:', error)
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
      >
        <motion.div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
            isActive
              ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600"
              : "text-gray-700 hover:bg-gray-50/80"
          )}
          whileHover={prefersReducedMotion ? {} : { x: 4, scale: 1.01 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Active indicator bar */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-r-full"
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
                ? "bg-gradient-to-br from-teal-100 to-cyan-100"
                : "bg-transparent group-hover:bg-gray-100"
            )}
            whileHover={prefersReducedMotion ? {} : { rotate: isActive ? 0 : 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] transition-all duration-200",
                isActive
                  ? "text-teal-600"
                  : "text-gray-500 group-hover:text-gray-700"
              )}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
          </motion.div>

          <span className={cn(
            "text-sm transition-all duration-200",
            isActive
              ? "font-semibold text-teal-700"
              : "font-medium group-hover:text-gray-900"
          )}>
            {item.name}
          </span>

          {/* Subtle glow effect on active */}
          {isActive && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-teal-200/20 to-cyan-200/20 rounded-xl"
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
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-gradient-to-b from-white to-gray-50/50 z-40 border-r border-gray-200/80">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Logo */}
        <motion.div
          className="px-4 py-5 border-b border-gray-100"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Link href="/feed" className="block">
            <motion.span
              className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent"
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Adventure Log
            </motion.span>
          </Link>
        </motion.div>

        {/* Main Navigation */}
        <nav className="px-3 py-4 space-y-1">
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
        <div className="px-3 pb-4">
          <motion.div
            className="border-t border-gray-200/80 pt-4 space-y-1"
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
        </div>

        {/* Stories Section */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <StoriesSection />
        </div>

        {/* Logout Button at Bottom */}
        <motion.div
          className="px-3 py-3 border-t border-gray-100 mt-auto bg-white/80 backdrop-blur-sm"
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
                className="h-[18px] w-[18px] text-gray-500 group-hover:text-red-600 transition-colors"
                strokeWidth={1.8}
              />
            </motion.div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </motion.button>
        </motion.div>
      </div>
    </aside>
  )
}
