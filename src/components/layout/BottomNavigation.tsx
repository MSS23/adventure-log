'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import {
  Home,
  Search,
  Plus,
  Activity,
  Globe
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    name: 'Upload',
    href: '/albums/new',
    icon: Plus,
  },
  {
    name: 'Globe',
    href: '/globe',
    icon: Globe,
  },
  {
    name: 'Feed',
    href: '/feed',
    icon: Activity,
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 md:hidden safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
                instagramStyles.interactive.touchTarget,
                instagramStyles.interactive.active,
                "touch-manipulation select-none",
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <div className={cn(
                "transition-all duration-200",
                isActive && "scale-110"
              )}>
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive ? "stroke-2" : "stroke-1.5"
                  )}
                />
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-200",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500"
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}