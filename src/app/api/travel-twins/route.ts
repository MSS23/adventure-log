import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc('get_travel_twins', { _user_id: user.id, _limit: 12 })
    if (error) throw error
    return NextResponse.json({ twins: data || [] })
  } catch (error) {
    log.error('Failed to load travel twins', { component: 'api/travel-twins', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to load travel twins' }, { status: 500 })
  }
}
