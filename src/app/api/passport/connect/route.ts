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
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    // Can't connect with yourself
    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Check that the target user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, privacy_level')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch the scanner's privacy level so the reverse follow respects it
    const { data: scannerUser, error: scannerError } = await supabaseAdmin
      .from('users')
      .select('id, privacy_level')
      .eq('id', userId)
      .single()

    if (scannerError || !scannerUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create both follow directions, skipping if already exists.
    // Private accounts get a 'pending' request instead of an auto-accepted
    // follow, and existing rows are never upgraded without consent.
    // Direction 1: scanner → passport owner
    const { data: existing1 } = await supabaseAdmin
      .from('follows')
      .select('id, status')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .maybeSingle()

    if (!existing1) {
      const { error: insert1Error } = await supabaseAdmin
        .from('follows')
        .insert({
          follower_id: userId,
          following_id: targetUserId,
          status: targetUser.privacy_level === 'private' ? 'pending' : 'accepted',
          created_at: new Date().toISOString(),
        })
      if (insert1Error) {
        log.error('Passport connect: failed to create follow', {
          component: 'PassportConnect',
          action: 'connect',
          userId,
          targetUserId,
        }, insert1Error as unknown as Error)
        return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
      }
    }

    // Direction 2: passport owner → scanner
    const { data: existing2 } = await supabaseAdmin
      .from('follows')
      .select('id, status')
      .eq('follower_id', targetUserId)
      .eq('following_id', userId)
      .maybeSingle()

    if (!existing2) {
      const { error: insert2Error } = await supabaseAdmin
        .from('follows')
        .insert({
          follower_id: targetUserId,
          following_id: userId,
          status: scannerUser.privacy_level === 'private' ? 'pending' : 'accepted',
          created_at: new Date().toISOString(),
        })
      if (insert2Error) {
        log.error('Passport connect: failed to create reverse follow', {
          component: 'PassportConnect',
          action: 'connect',
          userId,
          targetUserId,
        }, insert2Error as unknown as Error)
        return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
      }
    }

    log.info('Passport connect: mutual follow created', {
      component: 'PassportConnect',
      action: 'connect',
      userId,
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
