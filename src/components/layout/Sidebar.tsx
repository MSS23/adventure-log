'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Home,
  Globe,
  User,
  LogOut,
  Sparkles,
  BookOpen,
  Compass,
  BarChart3,
  Trophy,
  Bookmark,
  Bell,
  Map
} from 'lucide-react'
import { StoriesSection } from '@/components/feed/StoriesSection'
import { TripPlannerSidebar } from '@/components/trip-planner/TripPlannerSidebar'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false)

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

  return (
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] flex-col fixed left-0 top-0 bottom-0 bg-white z-40 border-r border-gray-200">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <Link href="/feed" className="block">
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Adventure Log
            </span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="px-3 py-4 space-y-0.5">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/feed' && pathname.startsWith(item.href))

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-teal-50 text-teal-600"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive
                      ? "text-teal-600"
                      : "text-gray-500 group-hover:text-gray-700"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className={cn(
                  "text-sm",
                  isActive
                    ? "font-semibold"
                    : "font-medium"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Profile Section */}
        <div className="px-3 pb-4">
          <div className="border-t border-gray-200 pt-4 space-y-0.5">
            {profileNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/profile' && pathname.startsWith(item.href))

              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-teal-50 text-teal-600"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive
                        ? "text-teal-600"
                        : "text-gray-500 group-hover:text-gray-700"
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className={cn(
                    "text-sm",
                    isActive
                      ? "font-semibold"
                      : "font-medium"
                  )}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Stories Section */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <StoriesSection />
        </div>

        {/* AI Trip Planner Button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsTripPlannerOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 group w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-sm hover:shadow-md"
          >
            <Sparkles
              className="h-4 w-4 text-white"
              strokeWidth={2}
            />
            <span className="text-sm font-semibold text-white">
              Plan My Trip
            </span>
          </button>
        </div>

        {/* Logout Button at Bottom */}
        <div className="px-3 py-3 border-t border-gray-100 mt-auto">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full text-left",
              "hover:bg-red-50",
              loggingOut && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogOut
              className="h-4 w-4 text-gray-500 group-hover:text-red-600 transition-colors"
              strokeWidth={2}
            />
            <span className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </button>
        </div>
      </div>

      {/* Trip Planner Sidebar */}
      <TripPlannerSidebar
        isOpen={isTripPlannerOpen}
        onClose={() => setIsTripPlannerOpen(false)}
      />
    </aside>
  )
}
