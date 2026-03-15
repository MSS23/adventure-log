'use client'

import dynamic from 'next/dynamic'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts'
import { PageTransition } from '@/components/animations/PageTransition'
import { PWAProvider } from '@/components/pwa'

const FloatingActionButton = dynamic(
  () => import('@/components/ui/FloatingActionButton').then(m => ({ default: m.FloatingActionButton })),
  { ssr: false }
)

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PWAProvider>
        <div className="min-h-screen bg-[#F5F7F0] dark:bg-[#000000] transition-colors duration-300">
          {/* Left Sidebar - Desktop only (>1024px) */}
          <Sidebar />

          {/* Top navigation for mobile and tablet */}
          <div className="lg:hidden">
            <TopNavigation />
          </div>

          {/* Main content area with sidebar spacing */}
          <main className="min-h-screen lg:ml-[240px] xl:ml-[260px] main-content-area">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-24 lg:pb-8 max-w-7xl">
              <PageTransition>
                {children}
              </PageTransition>
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
      </PWAProvider>
    </ProtectedRoute>
  )
}
