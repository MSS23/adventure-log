/**
 * PWA utilities for Adventure Log
 * Handles service worker registration, installation prompts, and offline functionality
 * Cross-platform compatible for web, iOS, and Android
 */

import { log } from './logger'
import { Platform } from './platform'

// Extend Navigator interface for PWA standalone detection
declare global {
  interface Navigator {
    standalone?: boolean
  }
}

export interface PWAInstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWACapabilities {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  hasServiceWorker: boolean
  hasNotifications: boolean
  canShare: boolean
}

export interface OfflineDataItem {
  id: string
  [key: string]: unknown
}

export class PWAManager {
  private static instance: PWAManager
  private installPrompt: PWAInstallPrompt | null = null
  private registration: ServiceWorkerRegistration | null = null
  private callbacks: {
    onInstallable?: () => void
    onInstalled?: () => void
    onOffline?: () => void
    onOnline?: () => void
    onUpdate?: (registration: ServiceWorkerRegistration) => void
  } = {}

  static getInstance(): PWAManager {
    if (!this.instance) {
      this.instance = new PWAManager()
    }
    return this.instance
  }

  async initialize() {
    try {
      // Only initialize PWA features on web platform
      if (Platform.isWeb()) {
        // Register service worker
        await this.registerServiceWorker()

        // Set up install prompt handling
        this.setupInstallPrompt()

        // Set up notification handling
        this.setupNotifications()
      }

      // Network detection works on all platforms
      this.setupNetworkDetection()

      log.info('PWA Manager initialized successfully', {
        component: 'PWAManager',
        action: 'initialize',
        platform: Platform.getPlatform()
      })
    } catch (error) {
      log.error('PWA Manager initialization failed', {
        component: 'PWAManager',
        action: 'initialize',
        platform: Platform.getPlatform()
      }, error)
    }
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      log.warn('Service Worker not supported', {
        component: 'PWAManager',
        action: 'register-sw'
      })
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      this.registration = registration

      log.info('Service Worker registered successfully', {
        component: 'PWAManager',
        action: 'register-sw',
        scope: registration.scope
      })

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available
              this.callbacks.onUpdate?.(registration)
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))

      return registration
    } catch (error) {
      log.error('Service Worker registration failed', {
        component: 'PWAManager',
        action: 'register-sw'
      }, error)
      return null
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent the default browser install prompt
      event.preventDefault()

      // Store the event for later use
      this.installPrompt = event as unknown as PWAInstallPrompt

      log.info('Install prompt available', {
        component: 'PWAManager',
        action: 'install-prompt-available'
      })

      this.callbacks.onInstallable?.()
    })

    // Detect if app is already installed
    window.addEventListener('appinstalled', () => {
      log.info('PWA installed successfully', {
        component: 'PWAManager',
        action: 'app-installed'
      })

      this.installPrompt = null
      this.callbacks.onInstalled?.()
    })
  }

  private setupNetworkDetection() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        this.callbacks.onOnline?.()
        log.info('Connection restored', {
          component: 'PWAManager',
          action: 'online',
          platform: Platform.getPlatform()
        })
      } else {
        this.callbacks.onOffline?.()
        log.info('Connection lost', {
          component: 'PWAManager',
          action: 'offline',
          platform: Platform.getPlatform()
        })
      }
    }

    if (Platform.isWeb()) {
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
    } else {
      // For native apps, use Capacitor Network plugin if available
      import('@capacitor/network').then(({ Network }) => {
        Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            this.callbacks.onOnline?.()
            log.info('Connection restored', {
              component: 'PWAManager',
              action: 'online',
              platform: Platform.getPlatform()
            })
          } else {
            this.callbacks.onOffline?.()
            log.info('Connection lost', {
              component: 'PWAManager',
              action: 'offline',
              platform: Platform.getPlatform()
            })
          }
        })
      }).catch(() => {
        // Network plugin not available, fall back to basic detection
        log.info('Capacitor Network plugin not available, using basic network detection', {
          component: 'PWAManager',
          action: 'setup-network-detection'
        })
      })
    }
  }

  private setupNotifications() {
    if (!('Notification' in window)) {
      log.warn('Notifications not supported', {
        component: 'PWAManager',
        action: 'setup-notifications'
      })
      return
    }

    // Check current permission status
    log.info('Notification permission status', {
      component: 'PWAManager',
      action: 'notification-permission',
      permission: Notification.permission
    })
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data

    switch (type) {
      case 'ALBUM_SYNCED':
        log.info('Album synced successfully', {
          component: 'PWAManager',
          action: 'album-synced',
          albumId: data.id
        })
        break

      case 'PHOTO_SYNCED':
        log.info('Photo synced successfully', {
          component: 'PWAManager',
          action: 'photo-synced',
          photoId: data.id
        })
        break

      default:
        log.debug('Unknown service worker message', {
          component: 'PWAManager',
          action: 'sw-message',
          type
        })
    }
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      log.warn('No install prompt available', {
        component: 'PWAManager',
        action: 'show-install-prompt'
      })
      return false
    }

    try {
      await this.installPrompt.prompt()
      const choice = await this.installPrompt.userChoice

      log.info('Install prompt result', {
        component: 'PWAManager',
        action: 'install-prompt-result',
        outcome: choice.outcome
      })

      this.installPrompt = null
      return choice.outcome === 'accepted'
    } catch (error) {
      log.error('Install prompt failed', {
        component: 'PWAManager',
        action: 'show-install-prompt'
      }, error)
      return false
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      log.warn('Notifications not supported', {
        component: 'PWAManager',
        action: 'request-notification-permission'
      })
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()

      log.info('Notification permission result', {
        component: 'PWAManager',
        action: 'notification-permission-result',
        permission
      })

      return permission
    } catch (error) {
      log.error('Notification permission request failed', {
        component: 'PWAManager',
        action: 'request-notification-permission'
      }, error)
      return 'denied'
    }
  }

  async shareContent(data: ShareData): Promise<boolean> {
    if (!navigator.share) {
      log.warn('Web Share API not supported', {
        component: 'PWAManager',
        action: 'share-content'
      })
      return false
    }

    try {
      await navigator.share(data)

      log.info('Content shared successfully', {
        component: 'PWAManager',
        action: 'share-content',
        title: data.title
      })

      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        log.info('Share cancelled by user', {
          component: 'PWAManager',
          action: 'share-cancelled'
        })
      } else {
        log.error('Share failed', {
          component: 'PWAManager',
          action: 'share-content'
        }, error)
      }
      return false
    }
  }

  async updateServiceWorker(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      await this.registration.update()

      log.info('Service Worker update triggered', {
        component: 'PWAManager',
        action: 'update-sw'
      })

      return true
    } catch (error) {
      log.error('Service Worker update failed', {
        component: 'PWAManager',
        action: 'update-sw'
      }, error)
      return false
    }
  }

  async clearCache(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))

      log.info('All caches cleared', {
        component: 'PWAManager',
        action: 'clear-cache',
        clearedCaches: cacheNames.length
      })

      return true
    } catch (error) {
      log.error('Cache clearing failed', {
        component: 'PWAManager',
        action: 'clear-cache'
      }, error)
      return false
    }
  }

  getCapabilities(): PWACapabilities {
    return {
      isInstallable: !!this.installPrompt,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator && !!this.registration,
      hasNotifications: 'Notification' in window && Notification.permission === 'granted',
      canShare: !!navigator.share
    }
  }

  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  // Offline storage utilities (cross-platform)
  async saveOfflineData(type: 'albums' | 'photos', data: OfflineDataItem): Promise<boolean> {
    try {
      const storageKey = `adventure-log-offline-${type}`
      let existingData: OfflineDataItem[] = []

      // Get existing data from appropriate storage
      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        existingData = JSON.parse(localStorage.getItem(storageKey) || '[]')
      } else {
        // For native apps, use Capacitor Preferences
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const result = await Preferences.get({ key: storageKey })
          existingData = result.value ? JSON.parse(result.value) : []
        } catch {
          // Preferences not available, use empty array
        }
      }

      existingData.push(data)

      // Save data to appropriate storage
      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(existingData))
      } else {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.set({
            key: storageKey,
            value: JSON.stringify(existingData)
          })
        } catch {
          // Preferences not available, skip storage
          return false
        }
      }

      log.info('Data saved for offline sync', {
        component: 'PWAManager',
        action: 'save-offline-data',
        type,
        dataId: data.id,
        platform: Platform.getPlatform()
      })

      // Register background sync if service worker is available (web only)
      if (Platform.isWeb() && this.registration && typeof window !== 'undefined' && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          await (this.registration as unknown as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(`background-sync-${type}`)
        } catch (error) {
          log.warn('Background sync registration failed', {
            component: 'PWAManager',
            action: 'register-background-sync',
            type
          }, error)
        }
      }

      return true
    } catch (error) {
      log.error('Failed to save offline data', {
        component: 'PWAManager',
        action: 'save-offline-data',
        type,
        platform: Platform.getPlatform()
      }, error)
      return false
    }
  }

  async getOfflineDataCount(type: 'albums' | 'photos'): Promise<number> {
    try {
      const storageKey = `adventure-log-offline-${type}`
      let data: OfflineDataItem[] = []

      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        data = JSON.parse(localStorage.getItem(storageKey) || '[]')
      } else {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const result = await Preferences.get({ key: storageKey })
          data = result.value ? JSON.parse(result.value) : []
        } catch {
          // Preferences not available
        }
      }

      return data.length
    } catch {
      return 0
    }
  }
}

// Global PWA manager instance
export const pwaManager = PWAManager.getInstance()

// Helper functions (cross-platform)
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (Platform.isWeb()) {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  // For native apps, they are always "installed"
  return Platform.isNative()
}

export function isPWACapable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  // Native apps are always "capable"
  if (Platform.isNative()) {
    return true
  }

  // Web platforms need service worker support
  return Platform.isWeb() &&
         'serviceWorker' in navigator &&
         'BeforeInstallPromptEvent' in window
}

export function getInstallationStatus(): 'installed' | 'installable' | 'not-supported' {
  if (Platform.isNative()) {
    return 'installed'
  }

  if (isPWAInstalled()) {
    return 'installed'
  }

  if (isPWACapable()) {
    return 'installable'
  }

  return 'not-supported'
}