import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePlaceInput } from '@/lib/trips/parse-place'
import { log } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const originUrl = request.nextUrl.origin

    let parsed: {
      name: string
      latitude: number
      longitude: number
      address: string | null
      source_url: string | null
    } | null = null

    if (body.input && typeof body.input === 'string') {
      parsed = await parsePlaceInput(body.input, originUrl)
      if (!parsed) {
        return NextResponse.json(
          { error: 'Could not identify a location from that input' },
          { status: 400 }
        )
      }
    } else if (
      typeof body.latitude === 'number' &&
      typeof body.longitude === 'number' &&
      typeof body.name === 'string'
    ) {
      parsed = {
        name: body.name.trim().slice(0, 200),
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address || null,
        source_url: body.source_url || null,
      }
    } else {
      return NextResponse.json({ error: 'Missing input or coordinates' }, { status: 400 })
    }

    // Determine next sort_order
    const { data: existing } = await supabase
      .from('trip_pins')
      .select('sort_order')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)

    const nextOrder = ((existing?.[0]?.sort_order as number | null) ?? 0) + 1

    const { data, error } = await supabase
      .from('trip_pins')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        name: parsed.name,
        note: body.note || null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        address: parsed.address,
        source_url: parsed.source_url,
        category: body.category || null,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) throw error

    // Record daily streak — silent best-effort
    try {
      await supabase.rpc('record_user_activity', { _user_id: user.id })
    } catch {
      /* noop */
    }

    return NextResponse.json({ pin: data }, { status: 201 })
  } catch (error) {
    log.error('Failed to create pin', { component: 'api/trips/pins', action: 'create', userId: user.id, tripId }, error as Error)
    return NextResponse.json({ error: 'Failed to add pin' }, { status: 500 })
  }
}
