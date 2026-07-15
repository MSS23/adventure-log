/**
 * React hooks for PWA functionality in Roamkeep
 * Provides easy-to-use hooks for PWA features
 */

import { useState, useEffect, useCallback } from 'react'
import { pwaManager, type PWACapabilities, type OfflineDataItem } from '@/lib/utils/pwa'
import { log } from '@/lib/utils/logger'

// Network Information API interface
interface NetworkInformation extends EventTarget {
  effectiveType?: string
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}

export interface PWAStatus {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  hasUpdate: boolean
  capabilities: PWACapabilities
}

export interface InstallPromptState {
  canInstall: boolean
  isInstalling: boolean
  showPrompt: boolean
}

// Main PWA hook
export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    hasUpdate: false,
    capabilities: pwaManager.getCapabilities()
  })

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Register callbacks synchronously so the effect cleanup can unsubscribe;
    // setCallbacks is additive (Set-based), so this no longer clobbers the
    // listeners registered by useInstallPrompt/usePWAUpdate.
    const unsubscribe = pwaManager.setCallbacks({
      onInstallable: () => {
        setStatus(prev => ({
          ...prev,
          isInstallable: true,
          capabilities: pwaManager.getCapabilities()
        }))
      },
      onInstalled: () => {
        setStatus(prev => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
          capabilities: pwaManager.getCapabilities()
        }))
      },
      onOnline: () => {
        setStatus(prev => ({ ...prev, isOnline: true }))
      },
      onOffline: () => {
        setStatus(prev => ({ ...prev, isOnline: false }))
      },
      onUpdate: () => {
        setStatus(prev => ({ ...prev, hasUpdate: true }))
      }
    })

    const initializePWA = async () => {
      try {
        // pwaManager.initialize() is idempotent, so re-mounts are safe
        await pwaManager.initialize()

        setStatus(prev => ({
          ...prev,
          capabilities: pwaManager.getCapabilities()
        }))

        setIsInitialized(true)

        log.info('PWA hooks initialized', {
          component: 'usePWA',
          action: 'initialize'
        })
      } catch (error) {
        log.error('PWA initialization failed', {
          component: 'usePWA',
          action: 'initialize'
        }, error)
      }
    }

    initializePWA()

    return unsubscribe
  }, [])

  const updateServiceWorker = useCallback(async () => {
    const success = await pwaManager.updateServiceWorker()
    if (success) {
      setStatus(prev => ({ ...prev, hasUpdate: false }))
      // Reload page to activate new service worker
      window.location.reload()
    }
    return success
  }, [])

  const clearCache = useCallback(async () => {
    const success = await pwaManager.clearCache()
    if (success) {
      // Reload to get fresh content
      window.location.reload()
    }
    return success
  }, [])

  return {
    ...status,
    isInitialized,
    updateServiceWorker,
    clearCache
  }
}

// Install prompt hook
export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    canInstall: false,
    isInstalling: false,
    showPrompt: false
  })

  useEffect(() => {
    // setCallbacks is additive — unsubscribe on unmount to avoid leaking
    // setState calls into an unmounted component.
    const unsubscribe = pwaManager.setCallbacks({
      onInstallable: () => {
        setState(prev => ({ ...prev, canInstall: true }))
      },
      onInstalled: () => {
        setState(prev => ({
          ...prev,
          canInstall: false,
          isInstalling: false,
          showPrompt: false
        }))
      }
    })

    // Check initial state
    const capabilities = pwaManager.getCapabilities()
    setState(prev => ({
      ...prev,
      canInstall: capabilities.isInstallable
    }))

    return unsubscribe
  }, [])

  const showInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showPrompt: true }))
  }, [])

  const hideInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showPrompt: false }))
  }, [])

  const install = useCallback(async () => {
    setState(prev => ({ ...prev, isInstalling: true }))

    try {
      const success = await pwaManager.showInstallPrompt()

      setState(prev => ({
        ...prev,
        isInstalling: false,
        showPrompt: false,
        canInstall: !success
      }))

      return success
    } catch (error) {
      setState(prev => ({ ...prev, isInstalling: false }))
      throw error
    }
  }, [])

  return {
    ...state,
    showInstallPrompt,
    hideInstallPrompt,
    install
  }
}

// Online/Offline status hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get connection info if available
    const connection = (navigator as NavigatorWithConnection).connection
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown')

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }

      connection.addEventListener('change', handleConnectionChange)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g'
  }
}

// Offline data management hook
export function useOfflineData() {
  const [offlineCount, setOfflineCount] = useState({
    albums: 0,
    photos: 0
  })

  useEffect(() => {
    const updateCounts = async () => {
      const albumsCount = await pwaManager.getOfflineDataCount('albums')
      const photosCount = await pwaManager.getOfflineDataCount('photos')

      setOfflineCount({
        albums: albumsCount,
        photos: photosCount
      })
    }

    updateCounts()

    // Update counts when online status changes
    const handleOnline = () => {
      updateCounts()
    }
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const saveOfflineAlbum = useCallback(async (albumData: OfflineDataItem) => {
    const success = await pwaManager.saveOfflineData('albums', albumData)
    if (success) {
      setOfflineCount(prev => ({ ...prev, albums: prev.albums + 1 }))
    }
    return success
  }, [])

  const saveOfflinePhoto = useCallback(async (photoData: OfflineDataItem) => {
    const success = await pwaManager.saveOfflineData('photos', photoData)
    if (success) {
      setOfflineCount(prev => ({ ...prev, photos: prev.photos + 1 }))
    }
    return success
  }, [])

  return {
    offlineCount,
    totalPending: offlineCount.albums + offlineCount.photos,
    saveOfflineAlbum,
    saveOfflinePhoto
  }
}

// PWA update hook
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // setCallbacks is additive — unsubscribe on unmount so this listener does
    // not accumulate across re-mounts.
    const unsubscribe = pwaManager.setCallbacks({
      onUpdate: () => {
        setUpdateAvailable(true)
      }
    })

    return unsubscribe
  }, [])

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true)
    try {
      const success = await pwaManager.updateServiceWorker()
      if (success) {
        setUpdateAvailable(false)
        // The page will reload automatically
      }
      return success
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    dismissUpdate
  }
}