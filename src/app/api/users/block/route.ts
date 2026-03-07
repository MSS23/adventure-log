import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/users/block
 * Block a user. Also removes any follow relationships between the two users.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitAsync(request, { ...rateLimitConfigs.moderation, keyPrefix: 'block-user' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { blocked_id, reason } = body as { blocked_id: string; reason?: string }

    if (!blocked_id) {
      return NextResponse.json({ error: 'Missing blocked_id' }, { status: 400 })
    }

    if (blocked_id === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User is already blocked' }, { status: 409 })
    }

    // Insert the block
    const { data: block, error: blockError } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id,
        reason: reason || null,
      })
      .select()
      .single()

    if (blockError) {
      log.error('Error blocking user', { component: 'BlockUser', action: 'block' }, blockError)
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 })
    }

    // Remove follow relationships in both directions using parameterized queries
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', blocked_id)

    const { error: deleteFollowsError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', blocked_id)
      .eq('following_id', user.id)

    if (deleteFollowsError) {
      log.error('Error removing follows after block', { component: 'BlockUser', action: 'remove-follows' }, deleteFollowsError)
      // Non-critical: block was still created successfully
    }

    log.info('User blocked', { component: 'BlockUser', action: 'block', blockedId: blocked_id })

    return NextResponse.json({ block }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/users/block', { component: 'BlockUser', action: 'block' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/block
 * Unblock a user.
 */
export async function DELETE(request: NextRequest) {
  const rateLimitResult = await rateLimitAsync(request, { ...rateLimitConfigs.moderation, keyPrefix: 'unblock-user' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const blockedId = searchParams.get('blocked_id')

    if (!blockedId) {
      return NextResponse.json({ error: 'Missing blocked_id parameter' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)

    if (deleteError) {
      log.error('Error unblocking user', { component: 'BlockUser', action: 'unblock' }, deleteError)
      return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 })
    }

    log.info('User unblocked', { component: 'BlockUser', action: 'unblock', unblockedId: blockedId })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Unexpected error in DELETE /api/users/block', { component: 'BlockUser', action: 'unblock' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
