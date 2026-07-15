import * as Sentry from '@sentry/nextjs'
import { hasAnalyticsConsent } from '@/lib/consent'

const replayConsented = hasAnalyticsConsent()
const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.npm_package_version

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  release,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  sendDefaultPii: false,
  replaysOnErrorSampleRate: replayConsented ? 0.5 : 0,
  replaysSessionSampleRate: replayConsented ? 0.05 : 0,
  integrations: replayConsented
    ? [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]
    : [],
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
  beforeSend(event, hint) {
    if (!event.exception) return event
    const error = hint.originalException
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message).toLowerCase()
      : ''
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
    if (
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('canceling statement due to statement timeout') ||
      code === '57014'
    ) return null

    const frames = event.exception.values?.[0]?.stacktrace?.frames
    const top = frames?.[frames.length - 1]?.filename || ''
    if (/^(chrome|moz|safari-web)-extension:\/\//i.test(top) || /\bcontent\.js$/i.test(top)) {
      return null
    }
    return event
  },
})

// Captures App Router navigations as transactions in current Sentry SDKs.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
