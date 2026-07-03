'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Home, Globe, BookOpen, User, MapPinned, Compass, Map } from 'lucide-react'
import { motion, MotionConfig } from 'framer-motion'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const navItems: NavItem[] = [
  { name: 'Feed', href: '/feed', icon: Home },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Places', href: '/places', icon: MapPinned },
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'Albums', href: '/albums', icon: BookOpen },
  { name: 'You', href: '/profile', icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[color:var(--color-ivory)]/90 backdrop-blur-xl border-t border-[color:var(--color-line-warm)] lg:hidden safe-area-pb"
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/feed' && pathname.startsWith(item.href))

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl',
                  'touch-manipulation select-none transition-colors duration-200',
                  'min-h-[44px] min-w-[44px]',
                  isActive
                    ? 'text-[color:var(--color-forest)]'
                    : 'text-[color:var(--color-muted-warm)] dark:text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink-soft)]',
                )}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-[color:var(--color-forest-tint)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    aria-hidden
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="relative flex flex-col items-center"
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.3 : 1.6}
                  />
                </motion.div>
                <span
                  className={cn(
                    'relative text-[11px] mt-1 transition-all duration-200',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </MotionConfig>
  )
}
