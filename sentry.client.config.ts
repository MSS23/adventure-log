import * as Sentry from '@sentry/nextjs'
import { hasAnalyticsConsent } from '@/lib/consent'

// Session replay is privacy-sensitive, so it is gated behind cookie consent
// (GDPR/UK). Error capture itself stays on (security/debugging), but no replay
// is recorded until the user opts in. Takes effect from the next page load
// after consent is granted.
const replayConsented = hasAnalyticsConsent()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
  debug: false,

  // Replay configuration (0 until the user consents to analytics)
  replaysOnErrorSampleRate: replayConsented
    ? (process.env.NODE_ENV === 'production' ? 0.5 : 1.0)
    : 0,
  replaysSessionSampleRate: replayConsented
    ? (process.env.NODE_ENV === 'production' ? 0.05 : 0.1)
    : 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // You can remove this option if you're not planning to use the Sentry Session Replay feature
  beforeSend(event, hint) {
    // Filter out certain errors if needed
    if (event.exception) {
      const error = hint.originalException
      // Don't send network errors for offline users
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase()
        if (message.includes('network error') || message.includes('failed to fetch')) {
          return null
        }
      }
    }
    return event
  },

  // Configure the environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.npm_package_version || '1.1.0',
})
