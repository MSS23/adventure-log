'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Home,
  Globe,
  BookOpen,
  User,
  Compass,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const navItems: NavItem[] = [
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Feed', href: '/feed', icon: Home },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'My Log', href: '/albums', icon: BookOpen },
  { name: 'Profile', href: '/profile', icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-stone-200/30 dark:border-white/[0.06] lg:hidden safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/profile' && pathname.startsWith(item.href))

          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200",
                "touch-manipulation select-none active:scale-95",
                "min-h-[44px] min-w-[44px]",
                isActive
                  ? "text-olive-700 dark:text-olive-400"
                  : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              )}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                  )}
                  strokeWidth={isActive ? 2.3 : 1.6}
                />
                {/* Active dot */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-olive-600 dark:bg-olive-400" />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 transition-all duration-200",
                isActive ? "font-semibold" : "font-medium"
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
