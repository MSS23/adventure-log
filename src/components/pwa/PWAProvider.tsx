'use client'

import { useEffect, useRef } from 'react'
import { OfflineBanner } from './OfflineBanner'
import { UpdateNotification } from './UpdateNotification'
import { InstallBanner } from './InstallBanner'
import { SyncProgressToast } from './SyncProgressToast'
import { usePWA, useOnlineStatus, useOfflineData } from '@/lib/hooks/usePWA'
import { toast } from 'sonner'

interface PWAProviderProps {
  children: React.ReactNode
}

/**
 * PWAProvider consolidates all PWA-related UI components
 *
 * Features:
 * - Offline banner when connection is lost (with reconnection celebration)
 * - Update notification when new service worker is available
 * - Install banner to promote app installation (iOS Safari support)
 * - Sync progress toast for background uploads
 * - Auto-sync notification when coming back online
 *
 * Usage:
 * Wrap your app layout with this provider to enable PWA features
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const { isInitialized, capabilities } = usePWA()
  const { isOnline } = useOnlineStatus()
  const { totalPending } = useOfflineData()
  const wasOfflineRef = useRef(false)
  const hasShownSyncToastRef = useRef(false)

  useEffect(() => {
    if (isInitialized && process.env.NODE_ENV === 'development') {
      console.log('[PWA] Initialized with capabilities:', capabilities)
    }
  }, [isInitialized, capabilities])

  // Track offline state and show sync notification when coming online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      hasShownSyncToastRef.current = false
    } else if (wasOfflineRef.current && totalPending > 0 && !hasShownSyncToastRef.current) {
      // Coming back online with pending items
      hasShownSyncToastRef.current = true
      toast.info(
        `Syncing ${totalPending} pending item${totalPending !== 1 ? 's' : ''}...`,
        {
          description: 'Your offline changes are being uploaded',
          duration: 4000,
        }
      )
    }
  }, [isOnline, totalPending])

  return (
    <>
      {children}

      {/* PWA UI Components - only render on client */}
      <OfflineBanner />
      <UpdateNotification />
      <InstallBanner />
      <SyncProgressToast />
    </>
  )
}

// Export individual components for granular usage
export { OfflineBanner } from './OfflineBanner'
export { UpdateNotification } from './UpdateNotification'
export { InstallBanner } from './InstallBanner'
export { SyncProgressToast } from './SyncProgressToast'
export { NetworkStatusIndicator } from './NetworkStatusIndicator'
