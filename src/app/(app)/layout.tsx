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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {/* Sidebar for desktop */}
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <div className="lg:pl-64">
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-6 lg:p-10 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}