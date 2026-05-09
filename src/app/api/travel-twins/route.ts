import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_travel_twins', { _user_id: userId, _limit: 12 })
    if (error) throw error
    return NextResponse.json({ twins: data || [] })
  } catch (error) {
    log.error('Failed to load travel twins', { component: 'api/travel-twins', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to load travel twins' }, { status: 500 })
  }
}
