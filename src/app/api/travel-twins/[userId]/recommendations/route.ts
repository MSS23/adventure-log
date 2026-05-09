import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: twinId } = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_twin_recommendations', {
      _user_id: userId,
      _twin_id: twinId,
      _limit: 12,
    })
    if (error) throw error
    return NextResponse.json({ recommendations: data || [] })
  } catch (error) {
    log.error('Twin recommendations failed', { component: 'api/travel-twins/recommendations', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}
