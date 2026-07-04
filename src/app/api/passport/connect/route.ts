import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyPassportQrToken } from '@/lib/server/passport-qr-token'
import { rateLimitAsync } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/passport/connect
 * Connects the authenticated user (the "scanner") with the target user (the
 * "passport owner").
 *
 * Body: { targetUserId: string, qrToken?: string }
 *
 * Authorization model — who gets the instant MUTUAL accepted follow:
 *   - `qrToken` verifies (short-lived HMAC minted by /api/passport/qr-token,
 *     bound to the OWNER's id): proof of an in-person scan of the owner's
 *     on-screen QR → mutual accepted follow, regardless of privacy level.
 *   - Owner's privacy_level is 'public' (or unset): following them is
 *     unrestricted anyway → mutual accepted follow, as before.
 *   - A mutual accepted connection already exists: re-scan of an existing
 *     friend → same connected response (and blend re-surface) as before.
 *   - Otherwise (private/friends owner, no valid token — e.g. a long-lived
 *     copied share link, or a guessed user id): NO auto-accept. We create at
 *     most a one-directional scanner→owner follow with status 'pending' (the
 *     normal follow-request flow; the DB trigger notifies the owner) and
 *     return { connected: false, pending: true }.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit before any other work: per-USER (not per-IP), so one account
    // can't spray connects — 10/minute is generous for real in-person scans.
    const limit = await rateLimitAsync(request, {
      keyPrefix: 'passport-connect',
      identifier: userId,
      limit: 10,
      windowMs: 60 * 1000,
    })
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { targetUserId, qrToken } = body

    // Strict UUID shape check — targetUserId is also interpolated into a
    // PostgREST .or() filter below, so reject anything non-UUID outright.
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!targetUserId || typeof targetUserId !== 'string' || !UUID_PATTERN.test(targetUserId)) {
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

    // ── Authorization for the instant mutual connect ──────────────────────
    // A verified qrToken is cryptographic proof the scanner saw the owner's
    // live QR (the token is HMAC-bound to the owner's id and expires in 15
    // minutes). Without it, only public owners — or already-mutual friends —
    // get the instant path.
    const hasValidToken =
      typeof qrToken === 'string' && verifyPassportQrToken(qrToken, targetUserId)

    const targetIsPublic =
      targetUser.privacy_level == null || targetUser.privacy_level === 'public'

    // Existing rows in both directions (also reused by the pending path so it
    // never downgrades an accepted row).
    const { data: existingFollows } = await supabaseAdmin
      .from('follows')
      .select('id, follower_id, following_id, status')
      .or(
        `and(follower_id.eq.${userId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${userId})`
      )
    const scannerToTarget = existingFollows?.find(
      (f) => f.follower_id === userId && f.following_id === targetUserId
    )
    const targetToScanner = existingFollows?.find(
      (f) => f.follower_id === targetUserId && f.following_id === userId
    )
    const alreadyMutual =
      scannerToTarget?.status === 'accepted' && targetToScanner?.status === 'accepted'

    if (!hasValidToken && !targetIsPublic && !alreadyMutual) {
      // Private/friends owner, no in-person proof: downgrade to the normal
      // follow-request flow. Create ONLY scanner→owner with status 'pending'
      // — never touch the reverse direction, never downgrade an existing row
      // (accepted stays accepted, pending stays pending). The AFTER INSERT
      // trigger on `follows` (notify_on_follow) notifies the owner, so no
      // manual notification insert — and no passport_connect rows — here.
      if (!scannerToTarget) {
        const { error: pendingError } = await supabaseAdmin.from('follows').insert({
          follower_id: userId,
          following_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        if (pendingError) {
          log.error('Passport connect: failed to create follow request', {
            component: 'PassportConnect',
            action: 'follow-request',
            userId,
            targetUserId,
          }, pendingError as unknown as Error)
          return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
        }
      }

      log.info('Passport connect: no QR token for non-public target — follow request instead', {
        component: 'PassportConnect',
        action: 'follow-request',
        userId,
        targetUserId,
      })

      // Truthful state for the client banner: `pending` only when a pending
      // request actually exists (just created, or from before). If the scanner
      // already FOLLOWS the private owner one-way (accepted, no reverse), no
      // request exists or was sent — report `following` instead.
      const scannerToTargetAccepted = scannerToTarget?.status === 'accepted'
      return NextResponse.json({
        connected: false,
        pending: !scannerToTargetAccepted,
        following: scannerToTargetAccepted,
        user: {
          username: targetUser.username,
          displayName: targetUser.display_name || targetUser.username,
        },
      })
    }

    // Ensure an ACCEPTED follow exists in one direction.
    //
    // With a verified qrToken this is explicit, in-person mutual consent (the
    // owner showed their live QR, the scanner physically scanned it) → both
    // directions get accepted. Mutual acceptance is what makes the Travel
    // Blend work on both sides: the blend reads each user's albums under RLS,
    // which only grants access to accepted followers.
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

    // Direction 1: scanner → passport owner (authorized above: valid token,
    // public owner, or already mutual).
    const dir1 = await ensureAcceptedFollow(userId, targetUserId)

    // Direction 2: passport owner → scanner. Without in-person proof this must
    // respect the SCANNER's privacy too — a private scanner merely opening a
    // public owner's share link (auto-connect fires on page load) must not
    // hand the owner an accepted follow into their private account. With a
    // token, a public scanner, or an already-accepted reverse row, accept as
    // before; otherwise create at most a pending owner→scanner request (never
    // downgrading an existing row) that the scanner can approve normally.
    const scannerIsPublic =
      scannerUser.privacy_level == null || scannerUser.privacy_level === 'public'
    let dir2: { ok: true; changed: boolean } | { ok: false }
    if (hasValidToken || scannerIsPublic || targetToScanner?.status === 'accepted') {
      dir2 = await ensureAcceptedFollow(targetUserId, userId)
    } else if (!targetToScanner) {
      const { error: reversePendingError } = await supabaseAdmin.from('follows').insert({
        follower_id: targetUserId,
        following_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      dir2 = reversePendingError ? { ok: false } : { ok: true, changed: false }
    } else {
      dir2 = { ok: true, changed: false }
    }

    if (!dir1.ok || !dir2.ok) {
      log.error('Passport connect: failed to create mutual follow', {
        component: 'PassportConnect',
        action: 'connect',
        userId,
        targetUserId,
      })
      return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
    }

    log.info('Passport connect: follow ensured', {
      component: 'PassportConnect',
      action: 'connect',
      userId,
      targetUserId,
    })

    // The scanner lands on the "You're now connected" screen with a Travel
    // Blend link — but without this, the passport OWNER never learns the scan
    // happened. Notify them with a deep link to the same blend so both sides
    // of the connection get the compatibility view. Best-effort: a notification
    // failure must not fail the connect itself.
    //
    // The OWNER is notified on EVERY scan, not just when this call created the
    // follow rows. `newlyConnected` is false in two real cases where the owner
    // must still be pulled in:
    //   * claim_referral (referral auto-follow, migration 68) races this route
    //     — the QR/share URL carries ?ref=<owner>, so ReferralHandler often
    //     creates the mutual accepted follow FIRST and both directions look
    //     unchanged here.
    //   * re-scanning someone you're already connected with — a deliberate,
    //     in-person act that should land both travelers in the blend again.
    // A short dedupe window keeps a double-fired connect (retry button,
    // effect re-run) from stacking modals on the owner's device.
    const newlyConnected = dir1.changed || dir2.changed

    const DEDUPE_MS = 10 * 60 * 1000
    const { data: recentOwnerNotif } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('type', 'passport_connect')
      .eq('metadata->>scanner_id', userId)
      .gte('created_at', new Date(Date.now() - DEDUPE_MS).toISOString())
      .limit(1)
    const notifyOwner = !recentOwnerNotif?.length

    if (notifyOwner || newlyConnected) {
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
      const rows = []
      if (notifyOwner) {
        rows.push({
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
        })
      }
      if (newlyConnected) {
        rows.push({
          // → scanner (bell record only; their modal already fired in-app).
          // Only for genuinely new connections — re-scans shouldn't pile up
          // rows in the scanner's own bell.
          user_id: userId,
          sender_id: targetUserId,
          type: 'passport_connect',
          title: 'New travel connection',
          message: `You connected with ${ownerName} — see your Travel Blend together`,
          link: targetUser.username
            ? `/blend/${targetUser.username}`
            : '/followers',
          metadata: { scanner_id: userId },
        })
      }

      // supabase-js reports failures via the returned `error` — it does not
      // throw — so best-effort here means checking that, not try/catch.
      const { error: notifyError } = await supabaseAdmin
        .from('notifications')
        .insert(rows)
      if (notifyError) {
        log.error('Passport connect: connection notifications failed', {
          component: 'PassportConnect',
          action: 'notify',
          userId,
          targetUserId,
        }, notifyError as unknown as Error)
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
