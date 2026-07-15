export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeEnvironmentValidation } = await import(
      './src/lib/utils/environment-validator'
    )
    initializeEnvironmentValidation()

    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      await import('./sentry.server.config')
    }
  }

  if (
    process.env.NEXT_RUNTIME === 'edge' &&
    (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)
  ) {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string }
) => {
  // Only import Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureRequestError(err, request, context)
  }
}
