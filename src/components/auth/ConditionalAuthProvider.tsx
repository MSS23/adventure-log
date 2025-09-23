'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from './AuthProvider'

// Routes that don't need authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/terms',
  '/privacy'
]

export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip AuthProvider for public routes to avoid client reference manifest issues
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  // Apply AuthProvider for authenticated routes
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}