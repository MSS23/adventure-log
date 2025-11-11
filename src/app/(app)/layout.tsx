'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SuggestionsSidebar } from '@/components/layout/SuggestionsSidebar'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        {/* Left Sidebar - Desktop only (>1024px) */}
        <Sidebar />

        {/* Right Suggestions Sidebar - Large desktop only (>1280px) */}
        <SuggestionsSidebar />

        {/* Top navigation for mobile and tablet */}
        <div className="lg:hidden">
          <TopNavigation />
        </div>

        {/* Main content area with sidebar spacing */}
        <main className="pb-20 md:pb-8 lg:pb-8 min-h-screen lg:ml-[240px] xl:ml-[260px]">
          <div className="mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        {/* Bottom navigation for mobile */}
        <BottomNavigation />

        {/* Floating action button - mobile only */}
        <div className="lg:hidden">
          <FloatingActionButton />
        </div>

        {/* Keyboard shortcuts */}
        <KeyboardShortcuts />
      </div>
    </ProtectedRoute>
  )
}