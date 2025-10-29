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
import { StoriesSection } from '@/components/feed/StoriesSection'

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
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[280px] flex-col fixed left-0 top-0 h-screen border-r border-white/10 bg-[#0D2424] z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 pb-4 border-b border-white/10">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-base">AL</span>
            </div>
            <span className="text-xl font-semibold text-white">
              Adventure Log
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-teal-600/40 to-cyan-600/40 text-teal-300"
                    : "text-gray-300 hover:bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive
                      ? "stroke-2 text-teal-300"
                      : "stroke-[1.5] group-hover:scale-105"
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

        {/* Stories Section */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <StoriesSection />
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            <Link href="/privacy" className="hover:underline hover:text-gray-300">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline hover:text-gray-300">
              Terms
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:underline hover:text-gray-300">
              Settings
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            © 2025 ADVENTURE LOG
          </p>
        </div>
      </div>
    </aside>
  )
}
