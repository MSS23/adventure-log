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
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar for desktop */}
        <AppSidebar 
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Main content area */}
        <div className="lg:pl-64">
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}