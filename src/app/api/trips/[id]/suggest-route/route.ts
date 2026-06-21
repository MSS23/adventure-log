import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTripAccess } from '@/lib/trips/authorize'
import { suggestRoute } from '@/lib/trips/suggest-route'
import { log } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Mirror the GET route's access contract instead of relying on RLS alone:
    // a non-member must not be able to enumerate a private trip's pins.
    const access = await getTripAccess(supabase, id, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!access.isMember && !access.isPublic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: pins, error } = await supabase
      .from('trip_pins')
      .select('*')
      .eq('trip_id', id)

    if (error) throw error
    const plans = suggestRoute(pins || [])
    return NextResponse.json({ plans })
  } catch (error) {
    log.error('Suggest route failed', { component: 'api/trips/suggest-route', userId, tripId: id }, error as Error)
    return NextResponse.json({ error: 'Failed to suggest route' }, { status: 500 })
  }
}
