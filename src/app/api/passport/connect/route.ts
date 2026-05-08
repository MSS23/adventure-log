import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/passport/connect
 * Creates a mutual follow between the authenticated user and the target user.
 * Used when scanning someone's passport QR code.
 *
 * Body: { targetUserId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    // Can't connect with yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Check that the target user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create both follow directions, skipping if already exists
    // Direction 1: scanner → passport owner
    const { data: existing1 } = await supabaseAdmin
      .from('follows')
      .select('id, status')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()

    if (!existing1) {
      await supabaseAdmin
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'accepted',
          created_at: new Date().toISOString(),
        })
    } else if (existing1.status !== 'accepted') {
      await supabaseAdmin
        .from('follows')
        .update({ status: 'accepted' })
        .eq('id', existing1.id)
    }

    // Direction 2: passport owner → scanner
    const { data: existing2 } = await supabaseAdmin
      .from('follows')
      .select('id, status')
      .eq('follower_id', targetUserId)
      .eq('following_id', user.id)
      .maybeSingle()

    if (!existing2) {
      await supabaseAdmin
        .from('follows')
        .insert({
          follower_id: targetUserId,
          following_id: user.id,
          status: 'accepted',
          created_at: new Date().toISOString(),
        })
    } else if (existing2.status !== 'accepted') {
      await supabaseAdmin
        .from('follows')
        .update({ status: 'accepted' })
        .eq('id', existing2.id)
    }

    log.info('Passport connect: mutual follow created', {
      component: 'PassportConnect',
      action: 'connect',
      userId: user.id,
      targetUserId,
    })

    return NextResponse.json({
      connected: true,
      user: {
        username: targetUser.username,
        displayName: targetUser.display_name || targetUser.username,
      },
    })
  } catch (err) {
    log.error('Passport connect failed', {
      component: 'PassportConnect',
      action: 'connect',
    }, err as Error)
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
  }
}
