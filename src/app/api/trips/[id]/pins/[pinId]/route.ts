import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pinId: string }> }
) {
  const { pinId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 200)
    if (body.note !== undefined) updates.note = body.note
    if (body.category !== undefined) updates.category = body.category
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

    const { data, error } = await supabase
      .from('trip_pins')
      .update(updates)
      .eq('id', pinId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ pin: data })
  } catch (error) {
    log.error('Failed to update pin', { component: 'api/trips/pins/[pinId]', action: 'update', userId: user.id, pinId }, error as Error)
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pinId: string }> }
) {
  const { pinId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase.from('trip_pins').delete().eq('id', pinId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to delete pin', { component: 'api/trips/pins/[pinId]', action: 'delete', userId: user.id, pinId }, error as Error)
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
  }
}
