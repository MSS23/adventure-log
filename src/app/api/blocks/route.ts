import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', user.id)

  return NextResponse.json({ blocks: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetId = body.user_id as string | undefined
    if (!targetId || targetId === user.id) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Block + auto-unfollow both directions
    await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: targetId,
    })
    await supabase
      .from('follows')
      .delete()
      .or(`and(follower_id.eq.${user.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${user.id})`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Block failed', { component: 'api/blocks', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetId = body.user_id as string | undefined
    if (!targetId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })

    await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Unblock failed', { component: 'api/blocks', userId: user.id }, error as Error)
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 })
  }
}
