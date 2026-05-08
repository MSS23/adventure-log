import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)) {
      updates.color = body.color
    }
    if (body.role && ['editor', 'viewer'].includes(body.role)) {
      updates.role = body.role
    }

    const { data, error } = await supabase
      .from('trip_members')
      .update(updates)
      .eq('id', memberId)
      .select('*, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (error) {
    log.error('Failed to update member', { component: 'api/trips/members/[memberId]', action: 'update', userId: user.id, memberId }, error as Error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase.from('trip_members').delete().eq('id', memberId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to remove member', { component: 'api/trips/members/[memberId]', action: 'delete', userId: user.id, memberId }, error as Error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
