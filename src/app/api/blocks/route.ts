import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', userId)

  return NextResponse.json({ blocks: data || [] })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  try {
    const body = await request.json()
    const targetId = body.user_id as string | undefined
    if (!targetId || targetId === userId) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Block + auto-unfollow both directions
    await supabase.from('user_blocks').insert({
      blocker_id: userId,
      blocked_id: targetId,
    })
    await supabase
      .from('follows')
      .delete()
      .or(`and(follower_id.eq.${userId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${userId})`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('Block failed', { component: 'api/blocks', userId }, error as Error)
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

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
