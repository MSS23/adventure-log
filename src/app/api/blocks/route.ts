import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', userId)

  return NextResponse.json({ blocks: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetId = body.user_id as string | undefined
    if (!targetId || targetId === userId) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Block + auto-unfollow both directions
    const { error: insertError } = await supabase.from('user_blocks').insert({
      blocker_id: userId,
      blocked_id: targetId,
    })
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Already blocked' }, { status: 409 })
      }
      log.error('Block insert failed', { component: 'api/blocks', userId }, insertError as unknown as Error)
      return NextResponse.json({ error: 'Failed to block' }, { status: 500 })
    }
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetId)
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', targetId)
      .eq('following_id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Block failed', { component: 'api/blocks', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetId = body.user_id as string | undefined
    if (!targetId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })

    await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', targetId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Unblock failed', { component: 'api/blocks', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 })
  }
}
