import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Configure the environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
})
