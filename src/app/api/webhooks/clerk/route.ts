import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { log } from '@/lib/utils/logger'

// Clerk → Supabase user provisioning. Clerk fires a webhook for every user
// lifecycle event; we mirror the relevant ones into public.users using the
// service-role client (bypasses RLS).
//
// Configure in Clerk Dashboard:
//   * Endpoint URL: https://<your-domain>/api/webhooks/clerk
//   * Events: user.created, user.updated, user.deleted
//   * Copy the signing secret into CLERK_WEBHOOK_SECRET in .env.local

interface ClerkEmailAddress {
  id: string
  email_address: string
}

interface ClerkUserData {
  id: string
  email_addresses?: ClerkEmailAddress[]
  primary_email_address_id?: string | null
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
}

interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string
  data: ClerkUserData & { deleted?: boolean }
}

function primaryEmail(data: ClerkUserData): string | null {
  if (!data.email_addresses?.length) return null
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id)
  return (primary ?? data.email_addresses[0]).email_address
}

function deriveUsername(data: ClerkUserData): string {
  // Order of preference: chosen username → email local-part → trailing chunk
  // of the Clerk id. We never collide-resolve here; the unique constraint on
  // public.users.username will throw and we'll log so the user can pick a new
  // one in onboarding.
  if (data.username) return data.username
  const email = primaryEmail(data)
  if (email) return email.split('@')[0].slice(0, 30)
  return `user_${data.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`
}

function deriveDisplayName(data: ClerkUserData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    log.error('CLERK_WEBHOOK_SECRET missing', {
      component: 'ClerkWebhook',
      action: 'verify',
    })
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!supabaseAdmin) {
    log.error('Supabase admin client unavailable (missing service role key)', {
      component: 'ClerkWebhook',
      action: 'init',
    })
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  // Svix sends three signature headers; all are required to verify.
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  const body = await request.text()

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    log.warn('Clerk webhook signature verification failed', {
      component: 'ClerkWebhook',
      action: 'verify',
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const data = event.data

  try {
    switch (event.type) {
      case 'user.created': {
        const { error } = await supabaseAdmin.from('users').insert({
          id: data.id,
          username: deriveUsername(data),
          display_name: deriveDisplayName(data),
          avatar_url: data.image_url ?? null,
          privacy_level: 'public',
        })
        if (error) {
          // 23505 = duplicate (id or username). Idempotent retry of the same
          // event is fine; surface anything else.
          if (error.code !== '23505') throw error
          log.info('Clerk user already provisioned', {
            component: 'ClerkWebhook',
            action: 'user.created',
            userId: data.id,
          })
        } else {
          log.info('Provisioned new user from Clerk', {
            component: 'ClerkWebhook',
            action: 'user.created',
            userId: data.id,
          })
        }
        break
      }

      case 'user.updated': {
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            display_name: deriveDisplayName(data),
            avatar_url: data.image_url ?? null,
          })
          .eq('id', data.id)
        if (error) throw error
        break
      }

      case 'user.deleted': {
        // Clerk sends `deleted: true` on this event. id is still set.
        const { error } = await supabaseAdmin.from('users').delete().eq('id', data.id)
        if (error) throw error
        log.info('Deleted user record on Clerk delete event', {
          component: 'ClerkWebhook',
          action: 'user.deleted',
          userId: data.id,
        })
        break
      }

      default:
        log.info('Ignoring unhandled Clerk webhook event', {
          component: 'ClerkWebhook',
          action: 'route',
          eventType: event.type,
        })
    }
  } catch (err) {
    log.error(
      'Clerk webhook handler failed',
      {
        component: 'ClerkWebhook',
        action: event.type,
        userId: data?.id,
      },
      err instanceof Error ? err : new Error(String(err)),
    )
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
