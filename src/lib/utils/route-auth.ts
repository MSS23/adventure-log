import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'

/**
 * Shared preamble for authenticated /api/me/* handlers: rate limit, then
 * resolve the caller. Returns either a ready-to-return error response or the
 * authenticated user. Admin-client availability is deliberately NOT handled
 * here — routes differ on whether a missing service key should fail open or
 * 503, so that stays with the caller.
 *
 *   const gate = await requireUser(request, 'email-prefs')
 *   if (gate.response) return gate.response
 *   const { user } = gate
 */
export async function requireUser(
  request: NextRequest,
  keyPrefix: string
): Promise<{ response: NextResponse; user?: undefined } | { response?: undefined; user: User }> {
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.api, keyPrefix })
  if (!rl.success) return { response: rateLimitResponse(rl.reset) }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  return { user }
}
