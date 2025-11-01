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
  Compass
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

const navItems: NavItem[] = [
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
    name: 'Profile',
    href: '/dashboard',
    icon: User,
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
    <aside className="hidden lg:flex lg:w-[240px] xl:w-[280px] flex-col fixed left-0 top-0 h-screen bg-white z-40 border-r border-gray-100">
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

        {/* AI Trip Planner Button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setIsTripPlannerOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-md hover:shadow-lg"
          >
            <Sparkles
              className="h-5 w-5 text-white"
              strokeWidth={2}
            />
            <span className="text-[15px] font-semibold text-white">
              Plan My Trip
            </span>
          </button>
        </div>

        {/* Logout Button at Bottom */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full",
              "hover:bg-red-50",
              loggingOut && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogOut
              className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors"
              strokeWidth={1.5}
            />
            <span className="text-[15px] font-normal text-gray-700 group-hover:text-red-600 transition-colors">
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
