import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

// GET — read current streak
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data } = await supabase
      .from('users')
      .select('current_streak_days, longest_streak_days, last_activity_date')
      .eq('id', user.id)
      .maybeSingle()
    return NextResponse.json({
      current: data?.current_streak_days || 0,
      longest: data?.longest_streak_days || 0,
      last_activity: data?.last_activity_date || null,
    })
  } catch (error) {
    log.error('Streak read failed', { component: 'api/me/streak' }, error as Error)
    return NextResponse.json({ current: 0, longest: 0, last_activity: null })
  }
}

// POST — record activity (idempotent per day)
export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await supabase.rpc('record_user_activity', { _user_id: user.id })
    if (error) throw error
    const row = data?.[0] || null
    return NextResponse.json({
      current: row?.current_streak_days || 0,
      longest: row?.longest_streak_days || 0,
      last_activity: row?.last_activity_date || null,
    })
  } catch (error) {
    log.error('Streak record failed', { component: 'api/me/streak', userId: user.id }, error as Error)
    return NextResponse.json({ current: 0, longest: 0, last_activity: null })
  }
}
