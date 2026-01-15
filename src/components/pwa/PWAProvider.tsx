'use client'

import { useEffect } from 'react'
import { OfflineBanner } from './OfflineBanner'
import { UpdateNotification } from './UpdateNotification'
import { InstallBanner } from './InstallBanner'
import { usePWA } from '@/lib/hooks/usePWA'

interface PWAProviderProps {
  children: React.ReactNode
}

/**
 * PWAProvider consolidates all PWA-related UI components
 *
 * Features:
 * - Offline banner when connection is lost
 * - Update notification when new service worker is available
 * - Install banner to promote app installation
 *
 * Usage:
 * Wrap your app layout with this provider to enable PWA features
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const { isInitialized, capabilities } = usePWA()

  useEffect(() => {
    if (isInitialized && process.env.NODE_ENV === 'development') {
      console.log('[PWA] Initialized with capabilities:', capabilities)
    }
  }, [isInitialized, capabilities])

  return (
    <>
      {children}

      {/* PWA UI Components - only render on client */}
      <OfflineBanner />
      <UpdateNotification />
      <InstallBanner />
    </>
  )
}

// Export individual components for granular usage
export { OfflineBanner } from './OfflineBanner'
export { UpdateNotification } from './UpdateNotification'
export { InstallBanner } from './InstallBanner'
