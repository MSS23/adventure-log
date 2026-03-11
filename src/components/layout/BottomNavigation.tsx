'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import {
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
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-[#F5F7F0]/90 dark:bg-black/90 backdrop-blur-xl border-t border-olive-200/30 dark:border-white/[0.06] lg:hidden safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = item.href && (pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href)))

            const Icon = item.icon

            const className = cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200",
              instagramStyles.interactive.touchTarget,
              instagramStyles.interactive.active,
              "touch-manipulation select-none",
              isActive
                ? "text-olive-700 dark:text-olive-400 bg-olive-100/60 dark:bg-olive-900/20"
                : "text-stone-500 dark:text-stone-500 hover:text-olive-700 dark:hover:text-olive-300"
            )

            const content = (
              <>
                <div className={cn(
                  "transition-all duration-200",
                  isActive && "scale-110"
                )}>
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                    )}
                  />
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 font-medium transition-all duration-200",
                  isActive ? "text-olive-700 dark:text-olive-400" : "text-stone-500 dark:text-stone-500"
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
                  aria-label={item.name}
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
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
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
