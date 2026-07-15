import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: recommendation, error: recError } = await supabase
      .from('place_recommendations')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (recError) throw recError
    if (!recommendation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: existing, error: lookupError } = await supabase
      .from('place_recommendation_completions')
      .select('id')
      .eq('recommendation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (lookupError) throw lookupError

    let completed: boolean
    if (existing) {
      const { error } = await supabase
        .from('place_recommendation_completions')
        .delete()
        .eq('id', existing.id)
      if (error) throw error
      completed = false
    } else {
      const { error } = await supabase
        .from('place_recommendation_completions')
        .insert({ recommendation_id: id, user_id: user.id })
      if (error) throw error
      completed = true
    }

    const { data: updated, error: countError } = await supabase
      .from('place_recommendations')
      .select('completion_count')
      .eq('id', id)
      .single()
    if (countError) throw countError

    return NextResponse.json({
      completed,
      completion_count: updated.completion_count ?? 0,
    })
  } catch (error) {
    log.error('Failed to toggle recommendation completion', {
      component: 'api/place-recommendations/[id]/complete',
      action: 'toggle',
      userId: user.id,
      recommendationId: id,
    }, error as Error)
    return NextResponse.json({ error: 'Failed to update your checklist' }, { status: 500 })
  }
}
