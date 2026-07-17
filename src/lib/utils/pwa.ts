/**
 * PWA utilities for Adventure Log
 * Handles service worker registration, installation prompts, and offline functionality
 * Cross-platform compatible for web, iOS, and Android
 */

import { log } from './logger'
import { Platform } from './platform'
import { addToQueue, getQueueCount } from './offline-queue'

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

export interface PWAEventCallbacks {
  onInstallable?: () => void
  onInstalled?: () => void
  onOffline?: () => void
  onOnline?: () => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
}

export class PWAManager {
  private static instance: PWAManager
  private installPrompt: PWAInstallPrompt | null = null
  private registration: ServiceWorkerRegistration | null = null
  private initialized = false
  // A Set of listeners per event (not a single slot): usePWA, useInstallPrompt
  // and usePWAUpdate all register callbacks against this singleton, and with a
  // single slot the last writer silently disconnected the others (e.g.
  // UpdateNotification and InstallBanner never fired).
  private listeners: {
    [K in keyof PWAEventCallbacks]-?: Set<NonNullable<PWAEventCallbacks[K]>>
  } = {
    onInstallable: new Set(),
    onInstalled: new Set(),
    onOffline: new Set(),
    onOnline: new Set(),
    onUpdate: new Set()
  }

  private emit(event: 'onInstallable' | 'onInstalled' | 'onOffline' | 'onOnline'): void
  private emit(event: 'onUpdate', registration: ServiceWorkerRegistration): void
  private emit(event: keyof PWAEventCallbacks, registration?: ServiceWorkerRegistration) {
    for (const listener of this.listeners[event]) {
      try {
        if (event === 'onUpdate') {
          (listener as (r: ServiceWorkerRegistration) => void)(registration as ServiceWorkerRegistration)
        } else {
          (listener as () => void)()
        }
      } catch (error) {
        // One broken listener must not stop the rest from being notified
        log.error('PWA event listener failed', {
          component: 'PWAManager',
          action: 'emit',
          event
        }, error)
      }
    }
  }

  static getInstance(): PWAManager {
    if (!this.instance) {
      this.instance = new PWAManager()
    }
    return this.instance
  }

  async initialize() {
    // Idempotent: this is the single PWA bootstrap, and it is intentionally
    // invoked from more than one mount point (the root-level registration
    // component for global/public-page coverage AND the in-app usePWA hook).
    // Guarding here means exactly one service-worker registration and one set
    // of event listeners regardless of how many callers fire.
    if (this.initialized) return
    this.initialized = true

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
              this.emit('onUpdate', registration)
            }
          })
        }
      })

      // Proactively poll for a new service worker every hour so long-lived
      // tabs pick up deploys without a manual reload. (Previously handled by
      // the now-removed service-worker.ts registration path.)
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))

      return registration
    } catch (error) {
      // The SW is a progressive enhancement. register() rejects with a generic
      // "Rejected"/SecurityError in plenty of normal contexts — private-mode
      // sessions, storage-blocked browsers, in-app WebViews, some extensions —
      // none of which are actionable for us. Log at WARN (dev console only; the
      // logger filters this out of Sentry/error_events as expected noise) and
      // degrade gracefully rather than reporting a non-bug as an error.
      log.warn('Service Worker registration failed', {
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

      this.emit('onInstallable')
    })

    // Detect if app is already installed
    window.addEventListener('appinstalled', () => {
      log.info('PWA installed successfully', {
        component: 'PWAManager',
        action: 'app-installed'
      })

      this.installPrompt = null
      this.emit('onInstalled')
    })
  }

  private setupNetworkDetection() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        this.emit('onOnline')
        log.info('Connection restored', {
          component: 'PWAManager',
          action: 'online',
          platform: Platform.getPlatform()
        })
      } else {
        this.emit('onOffline')
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
            this.emit('onOnline')
            log.info('Connection restored', {
              component: 'PWAManager',
              action: 'online',
              platform: Platform.getPlatform()
            })
          } else {
            this.emit('onOffline')
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

  // Registers listeners additively (multiple hooks can subscribe to the same
  // event) and returns an unsubscribe function so React effects can clean up
  // on unmount instead of leaking stale setState callbacks.
  setCallbacks(callbacks: PWAEventCallbacks): () => void {
    const entries = Object.entries(callbacks) as Array<
      [keyof PWAEventCallbacks, NonNullable<PWAEventCallbacks[keyof PWAEventCallbacks]>]
    >
    for (const [event, listener] of entries) {
      if (listener) {
        (this.listeners[event] as Set<typeof listener>).add(listener)
      }
    }
    return () => {
      for (const [event, listener] of entries) {
        if (listener) {
          (this.listeners[event] as Set<typeof listener>).delete(listener)
        }
      }
    }
  }

  // Offline storage utilities (cross-platform)
  //
  // Web path: writes into IndexedDB (`adventure-log-offline`) via the shared
  // offline-queue helper so the service worker can read the SAME store during
  // background sync. (A service worker cannot read localStorage, which is why
  // the previous localStorage-based implementation never synced.)
  //
  // Native path: Capacitor has no service-worker background sync, so it keeps
  // using Capacitor Preferences for at-rest queuing.
  async saveOfflineData(type: 'albums' | 'photos', data: OfflineDataItem): Promise<boolean> {
    try {
      if (Platform.isWeb()) {
        // Persist into IndexedDB (shared with the service worker).
        await addToQueue(type, data)
      } else {
        // For native apps, use Capacitor Preferences (append to a JSON array).
        const storageKey = `adventure-log-offline-${type}`
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const result = await Preferences.get({ key: storageKey })
          const existingData: OfflineDataItem[] = result.value ? JSON.parse(result.value) : []
          existingData.push(data)
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
      if (Platform.isWeb()) {
        // Read count from IndexedDB (shared with the service worker).
        return await getQueueCount(type)
      }

      // Native: count entries stored via Capacitor Preferences.
      const storageKey = `adventure-log-offline-${type}`
      try {
        const { Preferences } = await import('@capacitor/preferences')
        const result = await Preferences.get({ key: storageKey })
        const data: OfflineDataItem[] = result.value ? JSON.parse(result.value) : []
        return data.length
      } catch {
        return 0
      }
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
