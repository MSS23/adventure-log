import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin, isRlsError } from '@/lib/supabase/admin'
import { sanitizeText } from '@/lib/utils/input-validation'
import { log } from '@/lib/utils/logger'
import type { PlaceRecommendation, PlaceType } from '@/types/database'

const PLACE_TYPES: PlaceType[] = ['eat', 'visit', 'stay', 'activity']
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

// GET /api/place-recommendations — public list (works for anonymous users)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')?.trim() || null
    const countryCode = searchParams.get('country_code')?.trim() || null
    const type = searchParams.get('type')?.trim() || null
    // Cap q length before it ever reaches the filter builder (avoids pathological
    // inputs and keeps the .or() clause small).
    const q = (searchParams.get('q')?.trim() || '').slice(0, 100) || null
    const sort = searchParams.get('sort')?.trim() === 'new' ? 'new' : 'top'

    let limit = DEFAULT_LIMIT
    const limitParam = searchParams.get('limit')
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT)
      }
    }

    let query = supabase.from('place_recommendations').select('*')

    if (city) query = query.ilike('city', city) // case-insensitive exact match
    if (countryCode) query = query.eq('country_code', countryCode)
    if (type && PLACE_TYPES.includes(type as PlaceType)) {
      query = query.eq('place_type', type)
    }
    if (q) {
      // Escape PostgREST-reserved chars (backslash, double-quote) and the LIKE
      // wildcards (%, _) in the user value, then double-quote the value inside
      // .or() so commas/parens in legit input (e.g. "café, paris", "(closed)",
      // "Ben & Jerry's") are treated as literals instead of breaking the filter
      // syntax — which previously caused a 500 and allowed filter-clause injection.
      const safe = q.replace(/[\\"]/g, '\\$&').replace(/[%_]/g, '\\$&')
      const term = `%${safe}%`
      query = query.or(`title.ilike."${term}",tip.ilike."${term}",city.ilike."${term}"`)
    }

    if (sort === 'new') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query
        .order('bump_count', { ascending: false })
        .order('created_at', { ascending: false })
    }

    query = query.limit(limit)

    const { data: rows, error } = await query
    if (error) throw error

    const recommendations = (rows || []) as PlaceRecommendation[]
    const recIds = recommendations.map((r) => r.id)
    const creatorIds = Array.from(new Set(recommendations.map((r) => r.created_by)))

    // Stitch creator profiles in a single query (avoids relying on the embedded
    // FK relation hint and avoids N+1).
    const userMap = new Map<string, PlaceRecommendation['user']>()
    if (creatorIds.length > 0) {
      const { data: creators, error: creatorsError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', creatorIds)
      if (creatorsError) throw creatorsError
      for (const c of creators || []) {
        userMap.set(c.id, c as PlaceRecommendation['user'])
      }
    }

    // has_bumped: a single query over the current user's bumps for these recs.
    const bumpedSet = new Set<string>()
    if (userId && recIds.length > 0) {
      const { data: bumps, error: bumpsError } = await supabase
        .from('place_recommendation_bumps')
        .select('recommendation_id')
        .eq('user_id', userId)
        .in('recommendation_id', recIds)
      if (bumpsError) throw bumpsError
      for (const b of bumps || []) {
        bumpedSet.add(b.recommendation_id)
      }
    }

    const enriched: PlaceRecommendation[] = recommendations.map((r) => ({
      ...r,
      user: userMap.get(r.created_by),
      has_bumped: bumpedSet.has(r.id),
    }))

    return NextResponse.json({ recommendations: enriched })
  } catch (error) {
    log.error(
      'Failed to list place recommendations',
      { component: 'api/place-recommendations', action: 'list', userId },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}

// POST /api/place-recommendations — create (auth required)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const title = sanitizeText((body.title || '').toString().trim())
    if (!title || title.length > 200) {
      return NextResponse.json({ error: 'Title is required (1–200 chars)' }, { status: 400 })
    }

    const placeType = (body.place_type || '').toString()
    if (!PLACE_TYPES.includes(placeType as PlaceType)) {
      return NextResponse.json(
        { error: 'place_type must be one of: eat, visit, stay, activity' },
        { status: 400 }
      )
    }

    const city = sanitizeText((body.city || '').toString().trim())
    if (!city || city.length > 200) {
      return NextResponse.json({ error: 'City is required (1–200 chars)' }, { status: 400 })
    }

    const latitude = Number(body.latitude)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: 'latitude must be between -90 and 90' }, { status: 400 })
    }

    const longitude = Number(body.longitude)
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'longitude must be between -180 and 180' }, { status: 400 })
    }

    let tip: string | null = null
    if (body.tip !== undefined && body.tip !== null && body.tip !== '') {
      tip = sanitizeText(body.tip.toString())
      if (tip.length > 1000) {
        return NextResponse.json({ error: 'Tip must be 1000 characters or fewer' }, { status: 400 })
      }
    }

    // Normalize country_code server-side so the cities/Countries grouping stays
    // consistent: uppercase and validate against ISO-3166-1 alpha-2. Be lenient —
    // anything that doesn't match (or empty/null) is stored as null rather than 400.
    let countryCode: string | null = null
    if (body.country_code !== undefined && body.country_code !== null && body.country_code !== '') {
      const normalized = body.country_code.toString().trim().toUpperCase()
      countryCode = /^[A-Z]{2}$/.test(normalized) ? normalized : null
    }

    let locationName: string | null = null
    if (body.location_name !== undefined && body.location_name !== null && body.location_name !== '') {
      locationName = sanitizeText(body.location_name.toString().trim()) || null
    }

    const insertPayload = {
      created_by: userId,
      title,
      place_type: placeType,
      tip,
      city,
      country_code: countryCode,
      location_name: locationName,
      latitude,
      longitude,
    }

    // Prefer the RLS-bound client: the `place_recs_insert_own` policy (migration
    // 43) accepts a legitimate owner insert (created_by = auth.uid()) with no
    // service-role key. Only if RLS rejects it AND a key is configured do we retry
    // with the admin client. created_by is forced to the session user, never
    // client-supplied, so the admin path can't be used to post as someone else.
    let { data, error } = await supabase
      .from('place_recommendations')
      .insert(insertPayload)
      .select()
      .single()

    if (error && isRlsError(error) && supabaseAdmin) {
      ;({ data, error } = await supabaseAdmin
        .from('place_recommendations')
        .insert(insertPayload)
        .select()
        .single())
    }

    if (error) throw error

    return NextResponse.json({ recommendation: data }, { status: 201 })
  } catch (error) {
    log.error(
      'Failed to create place recommendation',
      { component: 'api/place-recommendations', action: 'create', userId },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 })
  }
}
