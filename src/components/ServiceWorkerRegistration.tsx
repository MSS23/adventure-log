'use client'

import { useEffect } from 'react'
import { pwaManager } from '@/lib/utils/pwa'
import { installGlobalErrorReporter } from '@/lib/utils/error-reporter'
import { log } from '@/lib/utils/logger'

/**
 * Root-level PWA bootstrap. Mounted in the root layout so it runs on every
 * route (app, auth, public). It installs the global error reporter and kicks
 * off the single, idempotent PWAManager initialization (which registers the
 * service worker). The in-app PWAProvider also calls pwaManager.initialize();
 * the manager's internal guard ensures only one registration happens.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Install global error handlers (window.error + unhandledrejection)
    // — sends events to /api/errors → public.error_events
    installGlobalErrorReporter()

    // Only register the service worker in production to avoid caching dev
    // assets / interfering with hot reload.
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      pwaManager.initialize().catch((error) => {
        log.error('Service Worker registration failed', {
          component: 'ServiceWorkerRegistration'
        }, error)
      })
    }
  }, [])

  return null // This component doesn't render anything
}
