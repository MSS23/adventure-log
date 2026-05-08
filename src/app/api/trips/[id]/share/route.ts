import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function POST(
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
    const isPublic = Boolean(body.is_public)

    // Load current trip
    const { data: trip, error: loadErr } = await supabase
      .from('trips')
      .select('id, owner_id, share_slug, is_public')
      .eq('id', id)
      .maybeSingle()
    if (loadErr || !trip) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (trip.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can change sharing' }, { status: 403 })
    }

    const updates: Record<string, unknown> = { is_public: isPublic }

    if (isPublic && !trip.share_slug) {
      const { data: slugData, error: slugErr } = await supabase.rpc('generate_trip_slug')
      if (slugErr) throw slugErr
      updates.share_slug = slugData
    }

    const { data: updated, error: updateErr } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updateErr) throw updateErr

    return NextResponse.json({ trip: updated })
  } catch (error) {
    log.error('Failed to toggle share', { component: 'api/trips/share', action: 'toggle', userId: user.id, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 })
  }
}
