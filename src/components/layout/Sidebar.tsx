'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Home,
  Compass,
  Globe,
  Bell,
  User,
  PlusSquare
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  activeIcon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/feed',
    icon: Home,
  },
  {
    name: 'Explore',
    href: '/search',
    icon: Compass,
  },
  {
    name: 'My Globe',
    href: '/globe',
    icon: Globe,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    name: 'Create',
    href: '/albums/new',
    icon: PlusSquare,
  },
  {
    name: 'Profile',
    href: '/dashboard',
    icon: User,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[280px] flex-col fixed left-0 top-0 h-screen border-r border-gray-200/50 dark:border-gray-700/30 bg-white dark:bg-[#0A1628] z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Adventure Log
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/20 dark:to-cyan-500/20 text-teal-600 dark:text-teal-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive
                      ? "stroke-2 text-teal-600 dark:text-teal-400"
                      : "stroke-[1.5] group-hover:scale-110"
                  )}
                />
                <span className={cn(
                  "font-medium text-base",
                  isActive && "font-semibold"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/privacy" className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Settings
            </Link>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            © 2025 ADVENTURE LOG
          </p>
        </div>
      </div>
    </aside>
  )
}
