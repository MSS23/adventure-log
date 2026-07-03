'use client'

import Link from 'next/link'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { useAuth } from '@/components/auth/AuthProvider'

/**
 * Public layout for routes that don't require authentication
 * Used for: shared albums, public profiles, etc.
 *
 * The signed-in app chrome (TopNavigation's scan/bell icons, the bottom nav)
 * only renders for authenticated visitors — every one of those controls
 * dead-ends for an anonymous user. Logged-out visitors get a minimal header
 * with the brand and a sign-in link instead.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {user ? (
        <TopNavigation />
      ) : (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8 xl:px-12">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-ink)] text-[color:var(--color-ivory)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 010 18" />
                </svg>
              </span>
              <span className="font-heading text-lg font-semibold text-foreground">
                Adventure Log
              </span>
            </Link>
            <Link
              href="/login"
              className="al-btn-accent inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Sign in
            </Link>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className="pb-28 md:pb-8 min-h-[calc(100dvh-4rem)] main-content-mobile">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8 xl:px-12">
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile — signed-in visitors only */}
      {user && <BottomNavigation />}
    </div>
  )
}
