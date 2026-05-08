'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/utils/service-worker'
import { installGlobalErrorReporter } from '@/lib/utils/error-reporter'
import { log } from '@/lib/utils/logger'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Install global error handlers (window.error + unhandledrejection)
    // — sends events to /api/errors → public.error_events
    installGlobalErrorReporter()

    // Only register service worker in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      registerServiceWorker().then((registration) => {
        if (registration) {
          log.info('Service Worker registered successfully', {
            component: 'ServiceWorkerRegistration',
            scope: registration.scope
          })
        }
      }).catch((error) => {
        log.error('Service Worker registration failed', {
          component: 'ServiceWorkerRegistration'
        }, error)
      })
    }
  }, [])

  return null // This component doesn't render anything
}
