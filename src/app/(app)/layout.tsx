'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { useState } from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Tablet sidebar (hidden by default, shows on menu click) */}
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Top navigation for desktop and tablet */}
        <TopNavigation onMenuClick={() => setSidebarOpen(true)} />

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
      </div>
    </ProtectedRoute>
  )
}