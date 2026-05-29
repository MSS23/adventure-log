import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pinId: string }> }
) {
  const { pinId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const undo = Boolean(body.undo)

    const { data, error } = await supabase
      .from('trip_pins')
      .update({
        visited_at: undo ? null : new Date().toISOString(),
        visited_by: undo ? null : userId,
      })
      .eq('id', pinId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ pin: data })
  } catch (error) {
    log.error('Checkin failed', { component: 'api/trips/pins/checkin', userId, pinId }, error as Error)
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
  }
}
