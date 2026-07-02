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

  // Only register the replay integration when the user has actually
  // consented — for everyone else the recorder isn't just sampled at 0, it's
  // never constructed (no rrweb bootstrapping, no mutation observers).
  integrations: replayConsented
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],

  // Drop noise from third-party browser extensions injected into the page
  // (these are NOT our code — e.g. content scripts and clipboard-hardening
  // shims) and from expected DB statement timeouts. Left unfiltered, this
  // floods Sentry ingest and trips a 429 rate-limit.
  ignoreErrors: [
    /Extension context invalidated/i,
    /CONTENT_SHELL/i,
    /Clipboard\.prototype\.writeText was already locked/i,
    /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
    'Non-Error promise rejection captured',
  ],
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^chrome:\/\//i,
    /\bcontent\.js$/i,
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
      // Expected Postgres statement-timeout noise (social likes/comments RLS
      // reads — see migration 61). Self-handled in the UI; don't report.
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : ''
      const msg =
        error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : ''
      if (code === '57014' || msg.includes('canceling statement due to statement timeout')) {
        return null
      }
      // Belt-and-suspenders: drop anything whose top frame is an extension script.
      const frames = event.exception.values?.[0]?.stacktrace?.frames
      const top = frames?.[frames.length - 1]?.filename || ''
      if (/^(chrome|moz|safari-web)-extension:\/\//i.test(top) || /\bcontent\.js$/i.test(top)) {
        return null
      }
    }
    return event
  },

  // Configure the environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.npm_package_version || '1.1.0',
})
