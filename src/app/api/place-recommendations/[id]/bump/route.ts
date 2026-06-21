import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin, isRlsError } from '@/lib/supabase/admin'
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

  // All operations here are user-scoped (read public recs; manage the caller's own
  // bump where user_id = auth.uid()), so the RLS-bound client handles them without
  // any service-role key. The denormalized bump_count is maintained by a trigger
  // that updates the recommendation row even when it's owned by someone else — that
  // cross-owner UPDATE requires the trigger to be SECURITY DEFINER (migration
  // 49_place_rec_bump_security_definer.sql). With that migration applied, bumping
  // works fully without the key. We retry on the rare RLS rejection with the admin
  // client when one happens to be configured.
  const db = supabase

  try {
    // 404 if the recommendation doesn't exist.
    const { data: rec, error: recError } = await db
      .from('place_recommendations')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (recError) throw recError
    if (!rec) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    // Does the current user already have a bump on this rec?
    const { data: existing, error: existingError } = await db
      .from('place_recommendation_bumps')
      .select('id')
      .eq('recommendation_id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (existingError) throw existingError

    let bumped: boolean
    if (existing) {
      let { error: deleteError } = await db
        .from('place_recommendation_bumps')
        .delete()
        .eq('id', existing.id)
      if (deleteError && isRlsError(deleteError) && supabaseAdmin) {
        ;({ error: deleteError } = await supabaseAdmin
          .from('place_recommendation_bumps')
          .delete()
          .eq('id', existing.id))
      }
      if (deleteError) throw deleteError
      bumped = false
    } else {
      let { error: insertError } = await db
        .from('place_recommendation_bumps')
        .insert({ recommendation_id: id, user_id: userId })
      if (insertError && isRlsError(insertError) && supabaseAdmin) {
        ;({ error: insertError } = await supabaseAdmin
          .from('place_recommendation_bumps')
          .insert({ recommendation_id: id, user_id: userId }))
      }
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
    const { data: updated, error: countError } = await db
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
