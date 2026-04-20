import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Client error sink. Posts land in public.error_events; RLS allows any
 * authenticated or anon user to insert but nobody to select.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('error_events').insert({
      user_id: user?.id || null,
      route: typeof body.route === 'string' ? body.route.slice(0, 300) : null,
      component: typeof body.component === 'string' ? body.component.slice(0, 120) : null,
      action: typeof body.action === 'string' ? body.action.slice(0, 120) : null,
      message: typeof body.message === 'string' ? body.message.slice(0, 2000) : 'Unknown',
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 4000) : null,
      user_agent: request.headers.get('user-agent')?.slice(0, 400) || null,
      severity:
        body.severity && ['info', 'warn', 'error', 'critical'].includes(body.severity)
          ? body.severity
          : 'error',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
