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

    // Fetch the scanner's privacy level (the reverse follow respects it) and
    // identity (the owner's notification names them and links to the blend).
    const { data: scannerUser, error: scannerError } = await supabaseAdmin
      .from('users')
      .select('id, privacy_level, username, display_name')
      .eq('id', userId)
      .single()

    if (scannerError || !scannerUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure an ACCEPTED follow exists in one direction.
    //
    // A passport QR scan is explicit, in-person mutual consent: the owner
    // shared their QR and the scanner physically scanned it. So we accept
    // immediately in BOTH directions regardless of either account's privacy
    // level, and upgrade any prior 'pending' request to 'accepted'. This is
    // what makes the connection actually mutual — and it's required for the
    // Travel Blend to work on both sides, because the blend reads each user's
    // albums under RLS, which only grants access to accepted followers.
    //
    // Returns whether this call created or upgraded the row (→ a fresh
    // connection worth notifying about) vs. it was already accepted.
    async function ensureAcceptedFollow(
      followerId: string,
      followingId: string,
    ): Promise<{ ok: true; changed: boolean } | { ok: false }> {
      const { data: existing } = await supabaseAdmin!
        .from('follows')
        .select('id, status')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle()

      if (!existing) {
        const { error } = await supabaseAdmin!.from('follows').insert({
          follower_id: followerId,
          following_id: followingId,
          status: 'accepted',
          created_at: new Date().toISOString(),
        })
        return error ? { ok: false } : { ok: true, changed: true }
      }

      if (existing.status !== 'accepted') {
        const { error } = await supabaseAdmin!
          .from('follows')
          .update({ status: 'accepted' })
          .eq('id', existing.id)
        return error ? { ok: false } : { ok: true, changed: true }
      }

      return { ok: true, changed: false }
    }

    // Direction 1: scanner → passport owner
    const dir1 = await ensureAcceptedFollow(userId, targetUserId)
    // Direction 2: passport owner → scanner
    const dir2 = await ensureAcceptedFollow(targetUserId, userId)

    if (!dir1.ok || !dir2.ok) {
      log.error('Passport connect: failed to create mutual follow', {
        component: 'PassportConnect',
        action: 'connect',
        userId,
        targetUserId,
      })
      return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
    }

    log.info('Passport connect: mutual follow ensured', {
      component: 'PassportConnect',
      action: 'connect',
      userId,
      targetUserId,
    })

    // The scanner lands on the "You're now connected" screen with a Travel
    // Blend link — but without this, the passport OWNER never learns the scan
    // happened. Notify them with a deep link to the same blend so both sides
    // of the connection get the compatibility view. Best-effort: a notification
    // failure must not fail the connect itself. Only on a NEW connection (a
    // direction was created or upgraded) — re-scanning an already-accepted
    // connection shouldn't re-notify.
    const newlyConnected = dir1.changed || dir2.changed
    if (newlyConnected) {
      try {
        const scannerName =
          scannerUser.display_name || scannerUser.username || 'A traveler'
        const ownerName =
          targetUser.display_name || targetUser.username || 'A traveler'

        // Both travelers get a persisted record of the connection, each
        // deep-linked to the SAME symmetric Travel Blend from their own side.
        // `metadata.scanner_id` is the scanner in BOTH rows — the client
        // PassportConnectListener only pops the "you're now connected" modal
        // when scanner_id !== the current user, so it celebrates on the OWNER's
        // device (who wasn't otherwise pulled in) and stays silent on the
        // scanner's (who already saw the modal on the passport page).
        await supabaseAdmin.from('notifications').insert([
          {
            // → owner (the person who was scanned)
            user_id: targetUserId,
            sender_id: userId,
            type: 'passport_connect',
            title: 'New travel connection',
            message: `${scannerName} scanned your passport — see your Travel Blend together`,
            link: scannerUser.username
              ? `/blend/${scannerUser.username}`
              : '/followers',
            metadata: { scanner_id: userId },
          },
          {
            // → scanner (bell record only; their modal already fired in-app)
            user_id: userId,
            sender_id: targetUserId,
            type: 'passport_connect',
            title: 'New travel connection',
            message: `You connected with ${ownerName} — see your Travel Blend together`,
            link: targetUser.username
              ? `/blend/${targetUser.username}`
              : '/followers',
            metadata: { scanner_id: userId },
          },
        ])
      } catch (notifyErr) {
        log.error('Passport connect: connection notifications failed', {
          component: 'PassportConnect',
          action: 'notify',
          userId,
          targetUserId,
        }, notifyErr as Error)
      }
    }

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
