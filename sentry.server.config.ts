import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: true,
  debug: false,

  // Configure the environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.npm_package_version || '1.1.0',

  // Server-specific options
  beforeSend(event, hint) {
    // Filter out certain errors if needed
    if (event.exception) {
      const error = hint.originalException
      // Don't log expected errors
      if (error && typeof error === 'object' && 'code' in error) {
        const code = String(error.code)
        // Filter out Supabase "not found" errors - these are expected
        if (code === 'PGRST116') {
          return null
        }
      }
    }
    return event
  },
})
