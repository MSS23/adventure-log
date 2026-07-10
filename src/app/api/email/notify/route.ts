import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailService, getAppUrl } from '@/lib/services/email'
import { buildUnsubscribeUrl } from '@/lib/utils/unsubscribe'
import { log } from '@/lib/utils/logger'
import { verifyBearer } from '@/lib/utils/bearer'

type NotificationType = 'welcome' | 'new_follower' | 'album_comment' | 'album_like'

interface NotifyPayload {
  type: NotificationType
  recipientUserId: string
  actorUserId?: string
  albumId?: string
  commentPreview?: string
}

/**
 * POST /api/email/notify
 * Send email notifications for social events.
 * SERVER-ONLY: Requires CRON_SECRET in Authorization header.
 * Not callable by regular users — only by internal server code.
 */
export async function POST(request: NextRequest) {
  try {
    // Server-only authentication via shared secret. Secret env var: CRON_SECRET.
    // Constant-time comparison prevents byte-by-byte secret recovery via
    // response-time timing attacks.
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (!verifyBearer(request.headers.get('authorization'), cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!emailService.isConfigured()) {
      return NextResponse.json({ sent: false, reason: 'Email service not configured' })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ sent: false, reason: 'Admin client not configured' })
    }

    const body: NotifyPayload = await request.json()
    const { type, recipientUserId, actorUserId, albumId, commentPreview } = body

    if (!type || !recipientUserId) {
      return NextResponse.json({ error: 'Missing type or recipientUserId' }, { status: 400 })
    }

    // Basic shape check on the Supabase user UUID; reject empties/whitespace.
    if (typeof recipientUserId !== 'string' || recipientUserId.trim().length === 0 || recipientUserId.length > 64) {
      return NextResponse.json({ error: 'Invalid recipientUserId format' }, { status: 400 })
    }

    // Get recipient info + email using admin client (bypasses RLS).
    // The canonical email lives on public.users.email.
    const { data: recipient } = await supabaseAdmin
      .from('users')
      .select('username, display_name, email, email_notifications')
      .eq('id', recipientUserId)
      .maybeSingle()

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Check if user has email notifications enabled (default: true)
    if (recipient.email_notifications === false) {
      return NextResponse.json({ sent: false, reason: 'User has email notifications disabled' })
    }

    const recipientEmail = recipient.email
    if (!recipientEmail) {
      return NextResponse.json({ sent: false, reason: 'No email for recipient' })
    }

    const recipientName = recipient.display_name || recipient.username || 'Traveler'

    // Signed one-click opt-out link, embedded in every email footer and the
    // List-Unsubscribe header (PECR/GDPR + Gmail/Yahoo sender requirements).
    const unsubscribeUrl = buildUnsubscribeUrl(getAppUrl(), recipientUserId)

    let sent = false

    switch (type) {
      case 'welcome': {
        sent = await emailService.sendWelcome(recipientEmail, recipientName, unsubscribeUrl)
        break
      }

      case 'new_follower': {
        if (!actorUserId) break
        const { data: actor } = await supabaseAdmin
          .from('users')
          .select('username, display_name')
          .eq('id', actorUserId)
          .maybeSingle()
        if (actor) {
          sent = await emailService.sendNewFollower(
            recipientEmail,
            recipientName,
            actor.display_name || actor.username,
            actor.username,
            unsubscribeUrl
          )
        }
        break
      }

      case 'album_comment': {
        if (!actorUserId || !albumId) break
        const [{ data: actor }, { data: album }] = await Promise.all([
          supabaseAdmin.from('users').select('username, display_name').eq('id', actorUserId).maybeSingle(),
          supabaseAdmin.from('albums').select('title').eq('id', albumId).maybeSingle(),
        ])
        if (actor && album) {
          sent = await emailService.sendAlbumComment(
            recipientEmail,
            recipientName,
            actor.display_name || actor.username,
            album.title,
            albumId,
            commentPreview || '',
            unsubscribeUrl
          )
        }
        break
      }

      case 'album_like': {
        if (!actorUserId || !albumId) break
        const [{ data: actor }, { data: album }] = await Promise.all([
          supabaseAdmin.from('users').select('username, display_name').eq('id', actorUserId).maybeSingle(),
          supabaseAdmin.from('albums').select('title').eq('id', albumId).maybeSingle(),
        ])
        if (actor && album) {
          sent = await emailService.sendAlbumLike(
            recipientEmail,
            recipientName,
            actor.display_name || actor.username,
            album.title,
            albumId,
            unsubscribeUrl
          )
        }
        break
      }
    }

    return NextResponse.json({ sent })
  } catch (err) {
    log.error('Email notify error', { component: 'EmailNotifyAPI', action: 'post' }, err as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
