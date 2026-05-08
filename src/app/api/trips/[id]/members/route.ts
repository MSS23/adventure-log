import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MEMBER_COLOR_PALETTE } from '@/types/trips'
import { log } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const username = (body.username || '').trim().replace(/^@/, '')
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const { data: target, error: userErr } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('username', username)
      .maybeSingle()

    if (userErr || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', target.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    // Pick next color that isn't already used
    const { data: currentMembers } = await supabase
      .from('trip_members')
      .select('color')
      .eq('trip_id', tripId)
    const usedColors = new Set((currentMembers || []).map((m) => m.color))
    const nextColor =
      MEMBER_COLOR_PALETTE.find((c) => !usedColors.has(c)) ||
      MEMBER_COLOR_PALETTE[(currentMembers?.length || 0) % MEMBER_COLOR_PALETTE.length]

    const { data: member, error: insertErr } = await supabase
      .from('trip_members')
      .insert({
        trip_id: tripId,
        user_id: target.id,
        color: nextColor,
        role: body.role === 'viewer' ? 'viewer' : 'editor',
      })
      .select('*, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .single()

    if (insertErr) throw insertErr
    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    log.error('Failed to add member', { component: 'api/trips/members', action: 'add', userId: user.id, tripId }, error as Error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
