/**
 * Fire-and-forget error reporter. Sends structured error events to
 * /api/errors which writes them to public.error_events. Non-blocking;
 * swallows its own failures to avoid infinite loops.
 */

interface ReportPayload {
  message: string
  stack?: string
  component?: string
  action?: string
  severity?: 'info' | 'warn' | 'error' | 'critical'
  route?: string
}

let installed = false
let recentKeys = new Set<string>()

export async function reportError(payload: ReportPayload): Promise<void> {
  if (typeof window === 'undefined') return
  // Dedupe same-message within 10 seconds to avoid floods
  const key = `${payload.component || ''}:${payload.action || ''}:${payload.message.slice(0, 80)}`
  if (recentKeys.has(key)) return
  recentKeys.add(key)
  setTimeout(() => recentKeys.delete(key), 10_000)

  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        ...payload,
        route: payload.route || window.location.pathname,
      }),
    })
  } catch {
    /* swallow */
  }
}

/**
 * Install global handlers for unhandled errors + promise rejections.
 * Call once from a top-level client component.
 */
export function installGlobalErrorReporter() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (event) => {
    reportError({
      message: event.message || 'Uncaught error',
      stack: event.error?.stack,
      component: 'window',
      action: 'uncaught-error',
      severity: 'error',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    reportError({
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection',
      stack: reason instanceof Error ? reason.stack : undefined,
      component: 'window',
      action: 'unhandled-rejection',
      severity: 'error',
    })
  })
}
