import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { log } from '@/lib/utils/logger'

// The trip tables may not exist yet on a Supabase project where migrations
// 26/27 haven't been applied. That is the ONLY case where the client should
// show the "launching soon" wall — every other failure is a real, transient
// error that deserves an error state + retry, not a fake "coming soon".
function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  // 42P01 = undefined_table (Postgres); PGRST205 = relation not found (PostgREST)
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    (typeof e.message === 'string' && /does not exist|could not find the table/i.test(e.message))
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: memberships, error } = await supabase
      .from('trip_members')
      .select('trip_id, role, color')
      .eq('user_id', userId)

    if (error) throw error
    const tripIds = (memberships || []).map((m) => m.trip_id)
    if (tripIds.length === 0) return NextResponse.json({ trips: [] })

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .in('id', tripIds)
      .order('updated_at', { ascending: false })

    if (tripsError) throw tripsError

    // Count pins per trip
    const { data: pinCounts } = await supabase
      .from('trip_pins')
      .select('trip_id')
      .in('trip_id', tripIds)

    const countMap = new Map<string, number>()
    for (const p of pinCounts || []) {
      countMap.set(p.trip_id, (countMap.get(p.trip_id) || 0) + 1)
    }

    const enriched = (trips || []).map((t) => ({
      ...t,
      pin_count: countMap.get(t.id) || 0,
      my_role: memberships?.find((m) => m.trip_id === t.id)?.role || 'viewer',
    }))

    return NextResponse.json({ trips: enriched })
  } catch (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: 'Trip planner is not provisioned yet', code: 'NOT_PROVISIONED' },
        { status: 503 }
      )
    }
    log.error('Failed to list trips', { component: 'api/trips', action: 'list', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to load trips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const title = (body.title || '').trim()
    if (!title || title.length > 120) {
      return NextResponse.json({ error: 'Title is required (1–120 chars)' }, { status: 400 })
    }

    // Insert with the service-role client: the live `trips` INSERT RLS policy was
    // lost during the Clerk auth migration, so the RLS-bound client is rejected
    // even for a legitimate owner insert. Safe here because owner_id is forced to
    // the authenticated session user (never client-supplied). See migration 41
    // for the corrective RLS policy.
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('trips')
      .insert({
        owner_id: userId,
        title,
        description: typeof body.description === 'string' ? body.description.slice(0, 500) : null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        cover_emoji: body.cover_emoji || '🗺️',
      })
      .select()
      .single()

    if (error) throw error

    // Streak — silent best-effort
    try {
      await supabase.rpc('record_user_activity', { _user_id: userId })
    } catch {
      /* noop */
    }

    return NextResponse.json({ trip: data }, { status: 201 })
  } catch (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: 'Trip planner is not provisioned yet', code: 'NOT_PROVISIONED' },
        { status: 503 }
      )
    }
    log.error('Failed to create trip', { component: 'api/trips', action: 'create', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
