'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Home,
  Compass,
  Globe,
  Bell,
  User
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
    name: 'Profile',
    href: '/dashboard',
    icon: User,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[280px] flex-col fixed left-0 top-0 h-screen bg-white z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/feed" className="block">
            <span className="text-2xl font-bold text-gray-900">
              Adventure Log
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-gray-100"
                    : "hover:bg-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive
                      ? "text-gray-900"
                      : "text-gray-600 group-hover:text-gray-900"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className={cn(
                  "text-[15px]",
                  isActive
                    ? "font-semibold text-gray-900"
                    : "font-normal text-gray-700"
                )}>
                  {item.name}
                </span>
                {item.name === 'Notifications' && isActive && (
                  <div className="ml-auto w-2 h-2 bg-teal-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Stories Section */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <StoriesSection />
        </div>

        {/* Footer - Removed to keep clean design */}
      </div>
    </aside>
  )
}
