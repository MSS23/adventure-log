import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function PATCH(
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 200)
    if (body.note === null || typeof body.note === 'string') updates.note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null
    if (typeof body.category === 'string') updates.category = body.category.slice(0, 50)
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trip_pins')
      .update(updates)
      .eq('id', pinId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ pin: data })
  } catch (error) {
    log.error('Failed to update pin', { component: 'api/trips/pins/[pinId]', action: 'update', userId, pinId }, error as Error)
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const { error } = await supabase.from('trip_pins').delete().eq('id', pinId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to delete pin', { component: 'api/trips/pins/[pinId]', action: 'delete', userId, pinId }, error as Error)
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
  }
}
