import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTripAccess } from '@/lib/trips/authorize'
import { log } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: tripId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Only the trip owner may change a member's role or color.
    const access = await getTripAccess(supabase, tripId, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      .eq('trip_id', tripId)
      .select('*, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (error) {
    log.error('Failed to update member', { component: 'api/trips/members/[memberId]', action: 'update', userId, memberId }, error as Error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: tripId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // The owner may remove anyone; a member may remove only themselves (leave).
    const access = await getTripAccess(supabase, tripId, userId)
    if (!access.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: targetMember } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('trip_id', tripId)
      .maybeSingle()

    if (!targetMember) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isSelf = targetMember.user_id === userId
    if (!access.isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Failed to remove member', { component: 'api/trips/members/[memberId]', action: 'delete', userId, memberId }, error as Error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
