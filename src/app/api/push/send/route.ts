import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hello@adventurelog.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface PushPayload {
  userId: string
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

/**
 * POST /api/push/send
 * Send a push notification to a specific user.
 * SERVER-ONLY: Requires CRON_SECRET in Authorization header.
 * Not callable by regular users — only by internal server code or cron jobs.
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

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ sent: false, reason: 'Push notifications not configured' })
    }

    const body: PushPayload = await request.json()
    const { userId, title, body: notifBody, icon, url, tag } = body

    if (!userId || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing userId, title, or body' }, { status: 400 })
    }

    // Validate userId is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
    }

    // Validate URL is internal if provided
    if (url && APP_URL && !url.startsWith('/') && !url.startsWith(APP_URL)) {
      return NextResponse.json({ error: 'URL must be a relative path or match app domain' }, { status: 400 })
    }

    // Use server client for DB queries (bypasses user auth since this is server-only)
    const supabase = await createClient()

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (subError) {
      log.error('Failed to fetch push subscriptions', { component: 'PushAPI' }, subError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: false, reason: 'No push subscriptions for user' })
    }

    const payload = JSON.stringify({
      title,
      body: notifBody,
      icon: icon || '/icons/icon-192x192.png',
      url: url || '/',
      tag: tag || 'default',
    })

    let sentCount = 0
    const staleEndpoints: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
          sentCount++
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(sub.endpoint)
          } else {
            log.error('Push send failed', { component: 'PushAPI', endpoint: sub.endpoint }, err as Error)
          }
        }
      })
    )

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .in('endpoint', staleEndpoints)

      log.info('Cleaned stale push subscriptions', {
        component: 'PushAPI',
        count: staleEndpoints.length,
        userId
      })
    }

    return NextResponse.json({ sent: true, count: sentCount })
  } catch (err) {
    log.error('Push send error', { component: 'PushAPI' }, err as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
