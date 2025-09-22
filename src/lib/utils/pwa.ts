/**
 * PWA utilities for Adventure Log
 * Handles service worker registration, installation prompts, and offline functionality
 */

import { log } from './logger'

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
      // Register service worker
      await this.registerServiceWorker()

      // Set up install prompt handling
      this.setupInstallPrompt()

      // Set up online/offline detection
      this.setupNetworkDetection()

      // Set up notification handling
      this.setupNotifications()

      log.info('PWA Manager initialized successfully', {
        component: 'PWAManager',
        action: 'initialize'
      })
    } catch (error) {
      log.error('PWA Manager initialization failed', {
        component: 'PWAManager',
        action: 'initialize'
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
      this.installPrompt = event as any

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
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        this.callbacks.onOnline?.()
        log.info('Connection restored', {
          component: 'PWAManager',
          action: 'online'
        })
      } else {
        this.callbacks.onOffline?.()
        log.info('Connection lost', {
          component: 'PWAManager',
          action: 'offline'
        })
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
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
                   (window.navigator as any).standalone === true,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator && !!this.registration,
      hasNotifications: 'Notification' in window && Notification.permission === 'granted',
      canShare: !!navigator.share
    }
  }

  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  // Offline storage utilities
  async saveOfflineData(type: 'albums' | 'photos', data: any): Promise<boolean> {
    try {
      const storageKey = `adventure-log-offline-${type}`
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]')
      existingData.push(data)
      localStorage.setItem(storageKey, JSON.stringify(existingData))

      log.info('Data saved for offline sync', {
        component: 'PWAManager',
        action: 'save-offline-data',
        type,
        dataId: data.id
      })

      // Register background sync if service worker is available
      if (this.registration && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          await this.registration.sync.register(`background-sync-${type}`)
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
        type
      }, error)
      return false
    }
  }

  getOfflineDataCount(type: 'albums' | 'photos'): number {
    try {
      const storageKey = `adventure-log-offline-${type}`
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return data.length
    } catch {
      return 0
    }
  }
}

// Global PWA manager instance
export const pwaManager = PWAManager.getInstance()

// Helper functions
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

export function isPWACapable(): boolean {
  return 'serviceWorker' in navigator &&
         'BeforeInstallPromptEvent' in window
}

export function getInstallationStatus(): 'installed' | 'installable' | 'not-supported' {
  if (isPWAInstalled()) {
    return 'installed'
  }

  if (isPWACapable()) {
    return 'installable'
  }

  return 'not-supported'
}