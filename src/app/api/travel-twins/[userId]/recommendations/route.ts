import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: twinId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc('get_twin_recommendations', {
      _user_id: user.id,
      _twin_id: twinId,
      _limit: 12,
    })
    if (error) throw error
    return NextResponse.json({ recommendations: data || [] })
  } catch (error) {
    log.error('Twin recommendations failed', { component: 'api/travel-twins/recommendations', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}
