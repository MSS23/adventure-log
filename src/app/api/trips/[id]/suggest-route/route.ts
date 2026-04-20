import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestRoute } from '@/lib/trips/suggest-route'
import { log } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: pins, error } = await supabase
      .from('trip_pins')
      .select('*')
      .eq('trip_id', id)

    if (error) throw error
    const plans = suggestRoute(pins || [])
    return NextResponse.json({ plans })
  } catch (error) {
    log.error('Suggest route failed', { component: 'api/trips/suggest-route', userId: user.id, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to suggest route' }, { status: 500 })
  }
}
