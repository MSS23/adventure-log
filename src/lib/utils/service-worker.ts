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

export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const success = await registration.unregister()

    if (success) {
      log.info('Service Worker unregistered', {
        component: 'ServiceWorker',
        action: 'unregister'
      })
    }

    return success
  } catch (error) {
    log.error('Service Worker unregistration failed', {
      component: 'ServiceWorker',
      action: 'unregister'
    }, error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

export async function checkForUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.update()

    log.info('Checked for Service Worker updates', {
      component: 'ServiceWorker',
      action: 'checkUpdates'
    })

    return registration
  } catch (error) {
    log.error('Update check failed', {
      component: 'ServiceWorker',
      action: 'checkUpdates'
    }, error instanceof Error ? error : new Error(String(error)))
    return null
  }
}

// Listen for service worker updates and notify user
export function listenForUpdates(onUpdate: () => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }

  const handleUpdate = () => {
    log.info('New Service Worker available', {
      component: 'ServiceWorker',
      action: 'update'
    })
    onUpdate()
  }

  navigator.serviceWorker.addEventListener('controllerchange', handleUpdate)

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', handleUpdate)
  }
}
