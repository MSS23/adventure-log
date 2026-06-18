import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { log } from '@/lib/utils/logger'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/place-recommendations/[id]/bump — toggle the current user's bump.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Reject non-UUID path segments before they hit Postgres — an invalid uuid
  // literal otherwise raises 22P02 and surfaces as a 500. Treat as not-found.
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    // 404 if the recommendation doesn't exist.
    const { data: rec, error: recError } = await supabaseAdmin
      .from('place_recommendations')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (recError) throw recError
    if (!rec) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    // Does the current user already have a bump on this rec?
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('place_recommendation_bumps')
      .select('id')
      .eq('recommendation_id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (existingError) throw existingError

    let bumped: boolean
    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from('place_recommendation_bumps')
        .delete()
        .eq('id', existing.id)
      if (deleteError) throw deleteError
      bumped = false
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('place_recommendation_bumps')
        .insert({ recommendation_id: id, user_id: userId })
      if (insertError) {
        // Gracefully handle the UNIQUE(recommendation_id, user_id) race: a
        // concurrent insert means a bump already exists, so treat as bumped.
        if (insertError.code === '23505') {
          bumped = true
        } else {
          throw insertError
        }
      } else {
        bumped = true
      }
    }

    // The DB trigger maintains bump_count; re-read the authoritative value.
    const { data: updated, error: countError } = await supabaseAdmin
      .from('place_recommendations')
      .select('bump_count')
      .eq('id', id)
      .single()
    if (countError) throw countError

    return NextResponse.json({ bumped, bump_count: updated.bump_count })
  } catch (error) {
    log.error(
      'Failed to toggle place recommendation bump',
      { component: 'api/place-recommendations/bump', action: 'toggle', userId },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to toggle bump' }, { status: 500 })
  }
}
