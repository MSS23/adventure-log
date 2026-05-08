import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailService } from '@/lib/services/email'
import { log } from '@/lib/utils/logger'

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
    // Server-only authentication via shared secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(recipientUserId)) {
      return NextResponse.json({ error: 'Invalid recipientUserId format' }, { status: 400 })
    }

    // Get recipient info using admin client (bypasses RLS)
    const { data: recipient } = await supabaseAdmin
      .from('users')
      .select('username, display_name, email_notifications')
      .eq('id', recipientUserId)
      .maybeSingle()

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Check if user has email notifications enabled (default: true)
    if (recipient.email_notifications === false) {
      return NextResponse.json({ sent: false, reason: 'User has email notifications disabled' })
    }

    // Get recipient email from auth using admin client
    const { data: { user: recipientAuth } } = await supabaseAdmin.auth.admin.getUserById(recipientUserId)
    const recipientEmail = recipientAuth?.email
    if (!recipientEmail) {
      return NextResponse.json({ sent: false, reason: 'No email for recipient' })
    }

    const recipientName = recipient.display_name || recipient.username || 'Traveler'

    let sent = false

    switch (type) {
      case 'welcome': {
        sent = await emailService.sendWelcome(recipientEmail, recipientName)
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
            actor.username
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
            commentPreview || ''
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
            albumId
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
