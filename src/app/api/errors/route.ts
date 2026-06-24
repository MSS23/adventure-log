import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * Client error sink. Posts land in public.error_events; RLS allows any
 * authenticated or anon user to insert but nobody to select.
 *
 * This endpoint is unauthenticated by design (it must capture errors from
 * logged-out users too), which makes it a storage-exhaustion / alert-poisoning
 * target. We therefore rate-limit per IP, and only let authenticated callers
 * raise a 'critical' severity so anon floods can't drown real alerts.
 */
const ERROR_SINK_LIMIT = { limit: 30, windowMs: 60 * 1000, keyPrefix: 'error-sink' }

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitAsync(request, ERROR_SINK_LIMIT)
    if (!limit.success) return rateLimitResponse(limit.reset)

    const body = await request.json().catch(() => ({}))
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Allow 'critical' only from authenticated users — otherwise clamp to 'error'
    // so an anonymous flood can't spam fake critical alerts.
    const requested =
      body.severity && ['info', 'warn', 'error', 'critical'].includes(body.severity)
        ? body.severity
        : 'error'
    const severity = requested === 'critical' && !userId ? 'error' : requested

    await supabase.from('error_events').insert({
      user_id: userId || null,
      route: typeof body.route === 'string' ? body.route.slice(0, 300) : null,
      component: typeof body.component === 'string' ? body.component.slice(0, 120) : null,
      action: typeof body.action === 'string' ? body.action.slice(0, 120) : null,
      message: typeof body.message === 'string' ? body.message.slice(0, 2000) : 'Unknown',
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 4000) : null,
      user_agent: request.headers.get('user-agent')?.slice(0, 400) || null,
      severity,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
