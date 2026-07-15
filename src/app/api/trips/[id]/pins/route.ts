import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTripAccess } from '@/lib/trips/authorize'
import { parsePlaceInput } from '@/lib/trips/parse-place'
import { safeHttpUrl } from '@/lib/utils/input-validation'
import { log } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Only the owner or an editor member may add pins.
    const access = await getTripAccess(supabase, tripId, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!access.isOwner && access.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      parsed = await parsePlaceInput(body.input, originUrl, {
        // The parser calls our authenticated geocode endpoint server-to-server.
        // Forward both web cookies and native bearer-session headers; without
        // this, every plain-text/POI pin was answered with a hidden 401.
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization'),
        refreshToken: request.headers.get('x-refresh-token'),
      })
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
      // Validate coordinate ranges here so out-of-range / NaN / Infinity values
      // return a 400 instead of tripping the DB CHECK constraints (lat ∈ [-90,90],
      // lng ∈ [-180,180]) and surfacing as an opaque 500.
      const lat = body.latitude
      const lng = body.longitude
      if (
        !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180
      ) {
        return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
      }
      const name = body.name.trim().slice(0, 200)
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
      parsed = {
        name,
        latitude: lat,
        longitude: lng,
        address: typeof body.address === 'string' ? body.address.trim().slice(0, 500) || null : null,
        // SECURITY: source_url is rendered as <a href> on the trip page AND
        // the public /t/[slug] share view — reject non-http(s) schemes at the
        // write boundary or a javascript: URL becomes stored XSS for every
        // visitor who clicks the pin link.
        source_url: safeHttpUrl(body.source_url),
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
        user_id: userId,
        name: parsed.name,
        note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
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
      await supabase.rpc('record_user_activity', { _user_id: userId })
    } catch {
      /* noop */
    }

    return NextResponse.json({ pin: data }, { status: 201 })
  } catch (error) {
    log.error('Failed to create pin', { component: 'api/trips/pins', action: 'create', userId: userId, tripId }, error as Error)
    return NextResponse.json({ error: 'Failed to add pin' }, { status: 500 })
  }
}
