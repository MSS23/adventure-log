'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import {
  Home,
  Plus,
  Activity,
  Globe,
  BookOpen,
  User,
  Sparkles
} from 'lucide-react'
import { TripPlannerSidebar } from '@/components/trip-planner/TripPlannerSidebar'

interface NavItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
}

const createNavItems = (onPlanTripClick: () => void): NavItem[] => [
  {
    name: 'Feed',
    href: '/feed',
    icon: Activity,
  },
  {
    name: 'Globe',
    href: '/globe',
    icon: Globe,
  },
  {
    name: 'Plan Trip',
    icon: Sparkles,
    onClick: onPlanTripClick,
  },
  {
    name: 'My Log',
    href: '/albums',
    icon: BookOpen,
  },
  {
    name: 'Profile',
    href: '/dashboard',
    icon: User,
  },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false)

  const navItems = createNavItems(() => setIsTripPlannerOpen(true))

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1A2332]/95 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/30 md:hidden safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
          {navItems.map((item) => {
            const isActive = item.href && (pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href)))

            const Icon = item.icon

            const className = cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
              instagramStyles.interactive.touchTarget,
              instagramStyles.interactive.active,
              "touch-manipulation select-none",
              "hover:bg-gray-50 dark:hover:bg-gray-800/50",
              isActive
                ? "text-teal-600 dark:text-teal-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            )

            const content = (
              <>
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
                  isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-500 dark:text-gray-500"
                )}>
                  {item.name}
                </span>
              </>
            )

            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={className}
                >
                  {content}
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href!}
                className={className}
              >
                {content}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Trip Planner Sidebar */}
      <TripPlannerSidebar
        isOpen={isTripPlannerOpen}
        onClose={() => setIsTripPlannerOpen(false)}
      />
    </>
  )
}