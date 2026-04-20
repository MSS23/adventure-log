import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: memberships, error } = await supabase
      .from('trip_members')
      .select('trip_id, role, color')
      .eq('user_id', user.id)

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
    log.error('Failed to list trips', { component: 'api/trips', action: 'list', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to load trips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const title = (body.title || '').trim()
    if (!title || title.length > 120) {
      return NextResponse.json({ error: 'Title is required (1–120 chars)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        owner_id: user.id,
        title,
        description: body.description || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        cover_emoji: body.cover_emoji || '🗺️',
      })
      .select()
      .single()

    if (error) throw error

    // Streak — silent best-effort
    try {
      await supabase.rpc('record_user_activity', { _user_id: user.id })
    } catch {
      /* noop */
    }

    return NextResponse.json({ trip: data }, { status: 201 })
  } catch (error) {
    log.error('Failed to create trip', { component: 'api/trips', action: 'create', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
