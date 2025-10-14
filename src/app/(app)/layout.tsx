'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { QuickActionsMenu } from '@/components/layout/QuickActionsMenu'
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Top navigation for desktop and tablet */}
        <TopNavigation />

        {/* Main content area */}
        <main className="pb-16 md:pb-8 min-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8 xl:px-12">
            {children}
          </div>
        </main>

        {/* Bottom navigation for mobile */}
        <BottomNavigation />

        {/* Floating action button */}
        <FloatingActionButton />

        {/* Quick actions menu - shows on desktop, hidden on mobile */}
        <div className="hidden md:block">
          <QuickActionsMenu />
        </div>

        {/* Keyboard shortcuts */}
        <KeyboardShortcuts />
      </div>
    </ProtectedRoute>
  )
}