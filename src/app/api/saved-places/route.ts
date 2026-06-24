import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'
import { sanitizeText, safeHttpUrl } from '@/lib/utils/input-validation'

const CATEGORIES = ['see', 'eat', 'do', 'stay', 'other']
const PLATFORMS = ['manual', 'tiktok', 'google_maps', 'instagram', 'other']

// GET /api/saved-places — list the current user's saved places (newest first)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table may not be provisioned yet — treat as empty rather than erroring.
      if (error.code === 'PGRST205' || error.code === 'PGRST200' || error.code === '42P01') {
        return NextResponse.json({ items: [], provisioned: false })
      }
      throw error
    }

    return NextResponse.json({ items: data || [], provisioned: true })
  } catch (error) {
    log.error('Failed to fetch saved places', { component: 'SavedPlacesAPI', action: 'fetch' }, error as Error)
    return NextResponse.json({ error: 'Failed to fetch saved places' }, { status: 500 })
  }
}

// POST /api/saved-places — save a confirmed place
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.place_name || !String(body.place_name).trim()) {
      return NextResponse.json({ error: 'Place name is required' }, { status: 400 })
    }

    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const category = body.category && CATEGORIES.includes(body.category) ? body.category : 'see'
    const sourcePlatform =
      body.source_platform && PLATFORMS.includes(body.source_platform) ? body.source_platform : 'manual'

    const { data, error } = await supabase
      .from('saved_places')
      .insert({
        user_id: user.id,
        // Strip any HTML at the write boundary (defense-in-depth — these render
        // as plain text today, but this keeps stored data clean for any future
        // surface: emails, OG cards, non-React render paths).
        place_name: sanitizeText(String(body.place_name)).trim().slice(0, 200),
        location_name: body.location_name ? sanitizeText(String(body.location_name)).slice(0, 300) : null,
        city: body.city ? sanitizeText(String(body.city)).slice(0, 120) : null,
        country_code: body.country_code ? String(body.country_code).toUpperCase().slice(0, 2) : null,
        latitude,
        longitude,
        category,
        notes: body.notes ? sanitizeText(String(body.notes)).slice(0, 2000) : null,
        source_platform: sourcePlatform,
        // Only store well-formed http(s) URLs — these end up in <img src>/<a href>.
        source_url: safeHttpUrl(body.source_url),
        thumbnail_url: safeHttpUrl(body.thumbnail_url),
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "You've already saved this place" }, { status: 409 })
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return NextResponse.json(
          { error: 'Saved Places is not enabled yet (database migration 55 pending).' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, item: data }, { status: 201 })
  } catch (error) {
    log.error('Failed to create saved place', { component: 'SavedPlacesAPI', action: 'create' }, error as Error)
    return NextResponse.json({ error: 'Failed to save place' }, { status: 500 })
  }
}
