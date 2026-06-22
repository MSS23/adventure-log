// Service Worker Registration and Management
import { log } from './logger'

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    log.warn('Service Worker not supported', {
      component: 'ServiceWorker',
      action: 'register'
    })
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    log.info('Service Worker registered', {
      component: 'ServiceWorker',
      action: 'register',
      scope: registration.scope
    })

    // Check for updates periodically
    setInterval(() => {
      registration.update()
    }, 60 * 60 * 1000) // Check every hour

    return registration
  } catch (error) {
    log.error('Service Worker registration failed', {
      component: 'ServiceWorker',
      action: 'register'
    }, error instanceof Error ? error : new Error(String(error)))
    return null
  }
}
