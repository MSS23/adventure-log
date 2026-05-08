import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Auto-transition trip statuses based on current date
    // (planning → live when start_date arrives; live/planning → completed after end_date)
    await Promise.all([
      supabase.rpc('auto_activate_current_trips', { _user_id: user.id }),
      supabase.rpc('auto_complete_expired_trips', { _user_id: user.id }),
    ]).catch(() => {
      // Non-fatal — these RPCs only exist after migration 28
    })

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (tripError) throw tripError
    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: members, error: memErr } = await supabase
      .from('trip_members')
      .select('*, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('trip_id', id)

    if (memErr) throw memErr

    const { data: pins, error: pinErr } = await supabase
      .from('trip_pins')
      .select('*')
      .eq('trip_id', id)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (pinErr) throw pinErr

    return NextResponse.json({ trip, members: members || [], pins: pins || [] })
  } catch (error) {
    log.error('Failed to load trip', { component: 'api/trips/[id]', action: 'get', userId: user.id, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to load trip' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 120)
    if (body.description !== undefined) updates.description = body.description
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date !== undefined) updates.end_date = body.end_date
    if (body.cover_emoji !== undefined) updates.cover_emoji = body.cover_emoji

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (error) {
    log.error('Failed to update trip', { component: 'api/trips/[id]', action: 'update', userId: user.id, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to delete trip', { component: 'api/trips/[id]', action: 'delete', userId: user.id, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
