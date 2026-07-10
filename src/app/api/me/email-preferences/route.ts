import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/utils/route-auth'
import { log } from '@/lib/utils/logger'

/**
 * PATCH /api/me/email-preferences
 *
 * users.email_notifications is column-level REVOKEd from client roles
 * (migrations 35/38/76), so the settings toggle writes it through this route
 * with the service-role client, scoped to the authenticated user. Reads come
 * from the profile already in AuthProvider context (get_my_profile RPC) —
 * no GET needed here.
 */
export async function PATCH(request: NextRequest) {
  const gate = await requireUser(request, 'email-prefs')
  if (gate.response) return gate.response
  const { user } = gate

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const enabled = (body as { email_notifications?: unknown })?.email_notifications
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'email_notifications must be a boolean' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ email_notifications: enabled })
    .eq('id', user.id)

  if (error) {
    log.error('Failed to update email preferences', { component: 'EmailPreferences', action: 'patch', userId: user.id }, error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }

  log.info('Email preferences updated', { component: 'EmailPreferences', action: 'patch', userId: user.id, enabled })
  return NextResponse.json({ email_notifications: enabled })
}
