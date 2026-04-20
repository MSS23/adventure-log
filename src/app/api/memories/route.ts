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
    const { data, error } = await supabase.rpc('get_memory_albums', { _user_id: user.id })
    if (error) throw error
    return NextResponse.json({ memories: data || [] })
  } catch (error) {
    log.error('Failed to load memories', { component: 'api/memories', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to load memories' }, { status: 500 })
  }
}
