'use client'

import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'

/**
 * Public layout for routes that don't require authentication
 * Used for: shared albums, public profiles, etc.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#1A1714] transition-colors duration-300">
      {/* Top navigation for desktop and tablet */}
      <TopNavigation />

      {/* Main content area */}
      <main className="pb-28 md:pb-8 min-h-[calc(100vh-4rem)] main-content-mobile">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8 xl:px-12">
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  )
}
