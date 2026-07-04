'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { pwaManager } from '@/lib/utils/pwa'
import { installGlobalErrorReporter } from '@/lib/utils/error-reporter'
import { log } from '@/lib/utils/logger'

/**
 * PWAManager already refuses to *register* a service worker on native
 * (Platform.isWeb() gate around registerServiceWorker()) — but that only
 * stops NEW registrations. A service worker installed by an older build
 * (before that gate existed, or from any future regression) persists in the
 * WebView's storage across APK reinstalls/updates — app data isn't wiped by
 * `adb install -r` or a Play Store update — and its cache-first fetch
 * handler keeps serving whatever JS/images it cached forever, regardless of
 * what the *current* bundle contains. Actively unregister + wipe caches on
 * every native launch so a stray old SW can't silently pin the app to a
 * previous build's assets (this is what caused the Wrapped globe to keep
 * rendering old code after a fresh install).
 */
async function purgeStaleNativeServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (registrations.length === 0) return

    const results = await Promise.all(
      registrations.map((registration) => registration.unregister())
    )

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    log.warn('Unregistered stale service worker on native platform', {
      component: 'ServiceWorkerRegistration',
      action: 'purge-native-sw',
      count: registrations.length
    })

    // Pages already under the old SW's control stay that way until the next
    // navigation — reload once so this launch serves fresh capacitor://
    // assets immediately instead of whatever the dead SW handed back.
    // unregister() resolves false (rather than throwing) on failure; only
    // reload when something actually unregistered, otherwise a WebView where
    // unregistration persistently fails would reload on every single launch.
    if (results.some(Boolean)) {
      window.location.reload()
    }
  } catch (error) {
    log.warn('Failed to purge native service worker', {
      component: 'ServiceWorkerRegistration',
      action: 'purge-native-sw'
    }, error)
  }
}

/**
 * Root-level PWA bootstrap. Mounted in the root layout so it runs on every
 * route (app, auth, public). It installs the global error reporter and kicks
 * off the single, idempotent PWAManager initialization (which registers the
 * service worker on web only). The in-app PWAProvider also calls
 * pwaManager.initialize(); the manager's internal guard ensures only one
 * registration happens.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Install global error handlers (window.error + unhandledrejection)
    // — sends events to /api/errors → public.error_events
    installGlobalErrorReporter()

    if (typeof window === 'undefined') return

    if (Capacitor.isNativePlatform()) {
      void purgeStaleNativeServiceWorker()
    }

    // Only register the service worker in production to avoid caching dev
    // assets / interfering with hot reload. (No-ops on native — see
    // Platform.isWeb() gate inside pwaManager.initialize().)
    if (process.env.NODE_ENV === 'production') {
      pwaManager.initialize().catch((error) => {
        log.error('Service Worker registration failed', {
          component: 'ServiceWorkerRegistration'
        }, error)
      })
    }
  }, [])

  return null // This component doesn't render anything
}
