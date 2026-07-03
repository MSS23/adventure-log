/**
 * Fire-and-forget growth analytics.
 *
 * Writes rows into public.growth_events (migration 70). The table is
 * write-only from the client (no SELECT policies); analysis runs with the
 * service-role key — see docs/growth/METRICS.md.
 *
 * Tracking must NEVER affect product behavior: every path here swallows
 * errors (the table may not exist yet if the migration hasn't been applied)
 * and nothing is awaited by callers.
 */

import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

export type GrowthEvent =
  | 'signup'
  | 'signup_via_ref'
  | 'first_pin'
  | 'album_created'
  | 'video_export'
  | 'card_export'
  | 'share_link_created'
  | 'share_link_visit'
  | 'wrapped_public_view'

// localStorage key holding the epoch-ms timestamp set at signup, consumed
// (once per device) when the user's first geolocated album exists.
const TTFP_KEY = 'al_ttfp_start'

// Postgres INTEGER max — value_ms is an int4 column.
const MAX_INT4 = 2147483647

export function trackGrowthEvent(
  event: GrowthEvent,
  opts?: { valueMs?: number; meta?: Record<string, unknown> }
): void {
  try {
    if (typeof window === 'undefined') return

    const supabase = createClient()

    let valueMs: number | null = null
    if (typeof opts?.valueMs === 'number' && Number.isFinite(opts.valueMs)) {
      valueMs = Math.min(Math.max(Math.round(opts.valueMs), 0), MAX_INT4)
    }

    void supabase.auth
      .getSession()
      .then(({ data }) =>
        supabase.from('growth_events').insert({
          user_id: data?.session?.user?.id ?? null,
          event,
          value_ms: valueMs,
          meta: opts?.meta ?? {},
        })
      )
      .then(({ error }) => {
        if (error) {
          log.debug(`Growth event insert failed: ${event}`, {
            component: 'GrowthEvents',
            action: 'track',
            code: error.code,
          })
        }
      })
      .catch(() => {
        // Table missing / offline / aborted — tracking is best-effort.
      })
  } catch {
    // createClient can throw when Supabase env is missing; never propagate.
  }
}

/**
 * Start the time-to-first-pin clock. Call at signup. No-op if the clock is
 * already running (or already consumed and re-set would double-count).
 */
export function markFirstPinStart(): void {
  try {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(TTFP_KEY) !== null) return
    localStorage.setItem(TTFP_KEY, String(Date.now()))
  } catch {
    // localStorage unavailable (private mode / quota) — skip silently.
  }
}

/**
 * If the time-to-first-pin clock is running, emit 'first_pin' with the
 * elapsed ms and stop the clock. Call after the user's first geolocated
 * album exists. Fires at most once per device: the key is removed before
 * the (fire-and-forget) insert, so repeat calls are no-ops.
 */
export function trackFirstPinIfPending(): void {
  try {
    if (typeof window === 'undefined') return

    const raw = localStorage.getItem(TTFP_KEY)
    if (raw === null) return
    localStorage.removeItem(TTFP_KEY)

    const start = Number(raw)
    if (!Number.isFinite(start) || start <= 0) return

    trackGrowthEvent('first_pin', { valueMs: Date.now() - start })
  } catch {
    // localStorage unavailable — skip silently.
  }
}
