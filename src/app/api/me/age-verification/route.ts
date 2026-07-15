import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/utils/route-auth'
import { isAdult, isIsoDateString, MIN_AGE } from '@/lib/utils/age'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/me/age-verification
 *
 * Email/password signups collect a DOB and the handle_new_user trigger
 * enforces 18+ at the database, but OAuth signups arrive with no DOB at all —
 * this backs the post-OAuth age gate (AgeGate.tsx) that closes that hole.
 * The gate's "is a DOB required?" read comes from the profile already in
 * AuthProvider context (get_my_profile RPC), so there is no GET here.
 *
 * date_of_birth is a locked-down PII column (migration 76), so the write
 * goes through the service-role client, scoped to the caller.
 */
export async function POST(request: NextRequest) {
  const gate = await requireUser(request, 'age-verify')
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

  const dob = (body as { date_of_birth?: unknown })?.date_of_birth
  if (typeof dob !== 'string' || !isIsoDateString(dob)) {
    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
  }

  if (!isAdult(dob)) {
    // Audit trail: the OSA/18+ posture depends on being able to show we act
    // on underage declarations, so the refusal is logged, not just returned.
    log.warn('Underage date of birth declared at age gate', {
      component: 'AgeVerification',
      action: 'underage-declaration',
      userId: user.id,
    })
    return NextResponse.json(
      { error: `You must be at least ${MIN_AGE} years old to use Roamkeep`, underage: true },
      { status: 403 }
    )
  }

  // The DOB is an auditable age record: write it only where none exists yet.
  // Rewriting an existing DOB through this route would let a user alter the
  // record they signed up with.
  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update({ date_of_birth: dob })
    .eq('id', user.id)
    .is('date_of_birth', null)
    .select('id')

  if (error) {
    log.error('Age verification update failed', { component: 'AgeVerification', action: 'post', userId: user.id }, error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    // 0 rows updated means EITHER a DOB already exists (fine — keep the
    // original audit record) OR the users row doesn't exist yet (first-login
    // provisioning race — AuthProvider retries profile creation for ~30s).
    // Distinguish them: reporting a missing row as "verified" would let the
    // gate dismiss without any age record being stored.
    const { data: row } = await supabaseAdmin
      .from('users')
      .select('date_of_birth')
      .eq('id', user.id)
      .maybeSingle()

    if (row?.date_of_birth) {
      return NextResponse.json({ verified: true, alreadySet: true })
    }
    log.warn('Age verification raced profile provisioning', {
      component: 'AgeVerification',
      action: 'post',
      userId: user.id,
    })
    return NextResponse.json({ error: 'Your profile is still being set up — try again in a moment' }, { status: 409 })
  }

  log.info('Post-OAuth age verification completed', { component: 'AgeVerification', action: 'post', userId: user.id })
  return NextResponse.json({ verified: true })
}
