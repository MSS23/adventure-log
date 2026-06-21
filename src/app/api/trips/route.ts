import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin, isRlsError } from '@/lib/supabase/admin'
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

// Accepts an HTML <input type="date"> value (YYYY-MM-DD) and confirms it's a real date.
function isValidDateStr(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

// Earliest date a new trip is allowed to start/end on, as YYYY-MM-DD.
// We anchor to UTC and apply a one-day grace window so that a legitimate
// "today" selection is never falsely rejected for users whose local date is
// still behind UTC. The accurate "no past dates" enforcement lives client-side
// (it uses the browser's local date); this is the server-side backstop.
function minAllowedTripDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
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

    const startDate = body.start_date || null
    const endDate = body.end_date || null

    // Validate any supplied dates: real dates, not in the past, and a sane range.
    if (startDate && !isValidDateStr(startDate)) {
      return NextResponse.json({ error: 'Please enter a valid start date.' }, { status: 400 })
    }
    if (endDate && !isValidDateStr(endDate)) {
      return NextResponse.json({ error: 'Please enter a valid end date.' }, { status: 400 })
    }
    const floor = minAllowedTripDate()
    if (startDate && startDate < floor) {
      return NextResponse.json({ error: 'Start date can’t be in the past.' }, { status: 400 })
    }
    if (endDate && endDate < floor) {
      return NextResponse.json({ error: 'End date can’t be in the past.' }, { status: 400 })
    }
    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json({ error: 'End date must be on or after the start date.' }, { status: 400 })
    }

    const insertPayload = {
      owner_id: userId,
      title,
      description: typeof body.description === 'string' ? body.description.slice(0, 500) : null,
      start_date: startDate,
      end_date: endDate,
      cover_emoji: body.cover_emoji || '🗺️',
    }

    // Prefer the RLS-bound client: with the `trips_insert_own` policy (migrations
    // 26/41) in place, a legitimate owner insert (owner_id = auth.uid()) succeeds
    // without any service-role key. Only if RLS rejects the insert AND a
    // service-role key is configured do we retry with the admin client. owner_id
    // is forced to the authenticated session user, never client-supplied, so the
    // admin path can't be abused to create trips for someone else.
    let { data, error } = await supabase
      .from('trips')
      .insert(insertPayload)
      .select()
      .single()

    if (error && isRlsError(error) && supabaseAdmin) {
      ;({ data, error } = await supabaseAdmin
        .from('trips')
        .insert(insertPayload)
        .select()
        .single())
    }

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
