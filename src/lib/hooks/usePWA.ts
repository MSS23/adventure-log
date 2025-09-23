/**
 * React hooks for PWA functionality in Adventure Log
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
    isOnline: navigator.onLine,
    hasUpdate: false,
    capabilities: pwaManager.getCapabilities()
  })

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializePWA = async () => {
      if (isInitialized) return

      try {
        await pwaManager.initialize()

        // Set up callbacks
        pwaManager.setCallbacks({
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
  }, [isInitialized])

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
    pwaManager.setCallbacks({
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
  const [isOnline, setIsOnline] = useState(navigator.onLine)
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

// Notifications hook
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [isSupported] = useState(typeof Notification !== 'undefined')

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied'

    const result = await pwaManager.requestNotificationPermission()
    setPermission(result)
    return result
  }, [isSupported])

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ) => {
    if (permission !== 'granted') {
      log.warn('Notification permission not granted', {
        component: 'useNotifications',
        action: 'show-notification',
        permission
      })
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      return registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      })
    } catch (error) {
      log.error('Failed to show notification', {
        component: 'useNotifications',
        action: 'show-notification'
      }, error)
      return null
    }
  }, [permission])

  return {
    isSupported,
    permission,
    canNotify: permission === 'granted',
    requestPermission,
    showNotification
  }
}

// Web Share API hook
export function useWebShare() {
  const [isSupported] = useState(!!navigator.share)

  const share = useCallback(async (data: ShareData) => {
    if (!isSupported) {
      log.warn('Web Share API not supported', {
        component: 'useWebShare',
        action: 'share'
      })
      return false
    }

    return pwaManager.shareContent(data)
  }, [isSupported])

  const shareAlbum = useCallback(async (albumTitle: string, albumUrl: string) => {
    return share({
      title: `${albumTitle} - Adventure Log`,
      text: `Check out my travel album: ${albumTitle}`,
      url: albumUrl
    })
  }, [share])

  const shareLocation = useCallback(async (locationName: string, coordinates?: { lat: number; lng: number }) => {
    const text = coordinates
      ? `Check out this amazing place: ${locationName} (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)})`
      : `Check out this amazing place: ${locationName}`

    return share({
      title: `${locationName} - Adventure Log`,
      text,
      url: window.location.href
    })
  }, [share])

  return {
    isSupported,
    share,
    shareAlbum,
    shareLocation
  }
}

// Offline data management hook
export function useOfflineData() {
  const [offlineCount, setOfflineCount] = useState({
    albums: 0,
    photos: 0
  })

  useEffect(() => {
    const updateCounts = () => {
      setOfflineCount({
        albums: pwaManager.getOfflineDataCount('albums'),
        photos: pwaManager.getOfflineDataCount('photos')
      })
    }

    updateCounts()

    // Update counts when online status changes
    const handleOnline = updateCounts
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
    pwaManager.setCallbacks({
      onUpdate: () => {
        setUpdateAvailable(true)
      }
    })
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