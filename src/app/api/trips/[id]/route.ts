import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTripAccess } from '@/lib/trips/authorize'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Auto-transition trip statuses based on current date
    // (planning → live when start_date arrives; live/planning → completed after end_date)
    await Promise.all([
      supabase.rpc('auto_activate_current_trips', { _user_id: userId }),
      supabase.rpc('auto_complete_expired_trips', { _user_id: userId }),
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

    // Only the owner, an explicit member, or anyone (if the trip is public)
    // may read the itinerary, member list, and pins.
    const access = await getTripAccess(supabase, id, userId)
    if (!access.isMember && !access.isPublic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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
    log.error('Failed to load trip', { component: 'api/trips/[id]', action: 'get', userId, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to load trip' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // Only the owner may edit a trip.
    const access = await getTripAccess(supabase, id, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 120)
    if (body.description === null || typeof body.description === 'string') updates.description = typeof body.description === 'string' ? body.description.slice(0, 2000) : null
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
    if (body.start_date === null || (typeof body.start_date === 'string' && ISO_DATE.test(body.start_date))) updates.start_date = body.start_date
    if (body.end_date === null || (typeof body.end_date === 'string' && ISO_DATE.test(body.end_date))) updates.end_date = body.end_date
    if (body.cover_emoji === null || (typeof body.cover_emoji === 'string' && body.cover_emoji.length <= 16)) updates.cover_emoji = body.cover_emoji

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (error) {
    log.error('Failed to update trip', { component: 'api/trips/[id]', action: 'update', userId, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Only the owner may delete a trip.
    const access = await getTripAccess(supabase, id, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to delete trip', { component: 'api/trips/[id]', action: 'delete', userId, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
