'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { useState } from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100/30 dark:from-gray-900 dark:to-blue-900/20 transition-colors duration-300">
        {/* Sidebar for desktop */}
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <div className="lg:pl-64">
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}