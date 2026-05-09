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
//
// SCHEMA REQUIREMENTS (enforced/loosened by migration 38):
//   * `public.users.email` MUST be NULLABLE. Phone-only Clerk signups have no
//     email at all; if the column is `NOT NULL`, the INSERT below 500s and
//     Clerk retry-storms the endpoint. We pass `email: primaryEmail(data)`
//     unconditionally and rely on the column accepting NULL.
//   * `public.users.username` MUST be NOT NULL UNIQUE. We always derive a
//     non-empty value via `deriveUsername()` (clerk-id fallback included).
//   * `public.users.phone TEXT` is OPTIONAL. If present, we mirror Clerk's
//     primary phone number on insert/update so phone-only users are still
//     findable. If absent, the column-list write skips the field (we use a
//     two-pass attempt that retries without `phone` on PGRST204).
//
// Other columns we read/write: id, display_name, avatar_url, privacy_level.
// Adding new mirrored fields requires updating BOTH the insert helper and the
// `user.updated` handler.
//
// If a required column is missing, the INSERT/UPDATE will 400 with PGRST204
// (column not found) and the webhook will return 500 — Clerk will retry. See
// migration 38 (parallel work-in-progress) and src/types/database.ts.

interface ClerkEmailAddress {
  id: string
  email_address: string
}

interface ClerkPhoneNumber {
  id: string
  phone_number: string
}

interface ClerkUserData {
  id: string
  email_addresses?: ClerkEmailAddress[]
  primary_email_address_id?: string | null
  phone_numbers?: ClerkPhoneNumber[]
  primary_phone_number_id?: string | null
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
}

interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string
  data: ClerkUserData & { deleted?: boolean }
}

// Shape of a Postgres unique-violation error as returned by PostgREST/Supabase.
// `code` is the SQLSTATE; `details` is the human string (e.g. 'Key
// (username)=(jane) already exists.'); `constraint` is sometimes present
// depending on driver version. We inspect all three to figure out *which*
// unique constraint blew up.
interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
  constraint?: string
}

const USERS_PKEY_CONSTRAINT = 'users_pkey'
const USERS_USERNAME_CONSTRAINT = 'users_username_key'
const MAX_USERNAME_RETRIES = 3

function primaryEmail(data: ClerkUserData): string | null {
  if (!data.email_addresses?.length) return null
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id)
  return (primary ?? data.email_addresses[0]).email_address
}

/**
 * Mirror of `primaryEmail()` for phone numbers — Clerk supports phone-only
 * signups (no email), and we want those users to still be findable by phone.
 * Returns null when the user has no phone on file.
 */
function primaryPhone(data: ClerkUserData): string | null {
  if (!data.phone_numbers?.length) return null
  const primary = data.phone_numbers.find((p) => p.id === data.primary_phone_number_id)
  return (primary ?? data.phone_numbers[0]).phone_number
}

function deriveUsername(data: ClerkUserData): string {
  // Order of preference: chosen username → email local-part → trailing chunk
  // of the Clerk id. Username collisions are resolved below in the insert
  // retry loop, so this only needs to produce a plausible starting point.
  if (data.username) return data.username
  const email = primaryEmail(data)
  if (email) return email.split('@')[0].slice(0, 30)
  return `user_${data.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`
}

function deriveDisplayName(data: ClerkUserData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

/**
 * Generate 4 random lowercase-alphanumeric chars, suitable for appending to a
 * username on collision (e.g. `jane` → `jane_a3f9`). Crypto-grade randomness
 * isn't security-critical here — collision avoidance just needs a wide enough
 * keyspace that 3 retries are basically certain to succeed.
 */
function randomSuffix(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < 4; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

/**
 * Decide which unique constraint a 23505 error refers to. PostgREST surfaces
 * the constraint name in `error.constraint` on newer versions and in
 * `error.details` (as `Key (column)=(value) already exists.`) everywhere.
 */
function classifyUniqueViolation(error: PostgrestErrorLike): 'id' | 'username' | 'unknown' {
  const constraint = error.constraint?.toLowerCase()
  if (constraint === USERS_PKEY_CONSTRAINT) return 'id'
  if (constraint === USERS_USERNAME_CONSTRAINT) return 'username'

  const details = (error.details ?? '').toLowerCase()
  const message = (error.message ?? '').toLowerCase()
  const haystack = `${details} ${message}`

  if (haystack.includes(USERS_USERNAME_CONSTRAINT) || /key \(username\)/.test(haystack)) {
    return 'username'
  }
  if (haystack.includes(USERS_PKEY_CONSTRAINT) || /key \(id\)/.test(haystack)) {
    return 'id'
  }
  return 'unknown'
}

/**
 * Truncate a username to fit within the schema's 30-char limit while leaving
 * room for the `_xxxx` suffix used on collision (5 chars).
 */
function truncateForSuffix(username: string, suffixLen = 5): string {
  const max = 30 - suffixLen
  return username.length > max ? username.slice(0, max) : username
}

/**
 * Build the row payload for an insert/update against public.users. Pulls
 * `phone` from Clerk's primary phone number; callers may strip it back out if
 * the column doesn't exist yet (see `isMissingPhoneColumnError`).
 *
 * Note `email` is intentionally allowed to be NULL — phone-only Clerk signups
 * have no email at all. Migration 38 makes the column nullable.
 */
function buildUserRow(data: ClerkUserData, username: string) {
  return {
    id: data.id,
    email: primaryEmail(data),
    phone: primaryPhone(data),
    username,
    display_name: deriveDisplayName(data),
    avatar_url: data.image_url ?? null,
    privacy_level: 'public' as const,
  }
}

/**
 * PostgREST returns PGRST204 ("Could not find the X column of Y in the schema
 * cache") when we INSERT/UPDATE a column that doesn't exist. We use this to
 * detect environments where migration 38 hasn't yet added `public.users.phone`
 * and quietly retry without the column rather than 500'ing back to Clerk.
 */
function isMissingPhoneColumnError(error: PostgrestErrorLike | null | undefined): boolean {
  if (!error) return false
  if (error.code !== 'PGRST204') return false
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  return haystack.includes("'phone'") || haystack.includes(' phone ') || haystack.includes('"phone"')
}

/**
 * Insert a brand-new public.users row keyed by the Clerk user id. Retries on
 * username collisions with a random suffix (up to MAX_USERNAME_RETRIES). Treats
 * id collisions as idempotent success (Clerk re-delivered the same webhook).
 *
 * Security note: the username-collision retry mitigates a registration soft-DoS
 * where an attacker registers `victim@example.com` first to claim the username
 * `victim`, blocking the real `victim@gmail.com` user from being provisioned.
 * Without this retry the legitimate user would be left with no profile row at
 * all and could not use the app.
 */
async function insertUserWithUsernameRetry(
  baseUsername: string,
  data: ClerkUserData,
): Promise<{ ok: true; username: string; usedSuffix: boolean } | { ok: false; reason: 'exhausted' | 'fatal'; error?: PostgrestErrorLike }> {
  if (!supabaseAdmin) return { ok: false, reason: 'fatal' }

  const truncated = truncateForSuffix(baseUsername)
  let attemptUsername = baseUsername

  for (let attempt = 0; attempt <= MAX_USERNAME_RETRIES; attempt++) {
    const row = buildUserRow(data, attemptUsername)
    let { error } = await supabaseAdmin.from('users').insert(row)

    // Migration 38 adds `public.users.phone`. In environments that haven't run
    // it yet, retry without the field so phone-less signups still succeed.
    if (isMissingPhoneColumnError(error as PostgrestErrorLike | null)) {
      const { phone: _phone, ...rowNoPhone } = row
      void _phone
      ;({ error } = await supabaseAdmin.from('users').insert(rowNoPhone))
    }

    if (!error) {
      return { ok: true, username: attemptUsername, usedSuffix: attempt > 0 }
    }

    const pgError = error as PostgrestErrorLike
    if (pgError.code !== '23505') {
      return { ok: false, reason: 'fatal', error: pgError }
    }

    const kind = classifyUniqueViolation(pgError)
    if (kind === 'id') {
      // Same Clerk user.id already provisioned — idempotent replay.
      return { ok: true, username: attemptUsername, usedSuffix: attempt > 0 }
    }
    if (kind === 'unknown') {
      // We hit 23505 but can't tell which constraint. Don't blindly retry —
      // surface as fatal so it shows up in logs and Clerk retries the webhook.
      return { ok: false, reason: 'fatal', error: pgError }
    }

    // Username collision — generate a new candidate and try again.
    attemptUsername = `${truncated}_${randomSuffix()}`
    log.warn('Username collision while provisioning Clerk user, retrying with suffix', {
      component: 'ClerkWebhook',
      action: 'user.created',
      userId: data.id,
      attempt: attempt + 1,
      nextUsername: attemptUsername,
    })
  }

  return { ok: false, reason: 'exhausted' }
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
        const baseUsername = deriveUsername(data)
        const result = await insertUserWithUsernameRetry(baseUsername, data)

        if (!result.ok) {
          if (result.reason === 'exhausted') {
            // 3 random 4-char suffixes all collided — astronomically unlikely
            // unless the username table is being attacked. Return 500 so Clerk
            // retries on its own schedule rather than silently dropping the
            // user.
            log.error(
              'Exhausted username retry budget while provisioning Clerk user',
              {
                component: 'ClerkWebhook',
                action: 'user.created',
                userId: data.id,
                baseUsername,
                maxRetries: MAX_USERNAME_RETRIES,
              },
            )
            return NextResponse.json(
              { error: 'Username collision retries exhausted' },
              { status: 500 },
            )
          }
          // Fatal non-collision DB error — re-throw so the outer catch logs and
          // returns 500.
          const err = result.error
          throw err instanceof Error
            ? err
            : new Error(
                `Insert failed: code=${err?.code ?? 'unknown'} message=${err?.message ?? 'unknown'}`,
              )
        }

        log.info('Provisioned new user from Clerk', {
          component: 'ClerkWebhook',
          action: 'user.created',
          userId: data.id,
          username: result.username,
          usedSuffix: result.usedSuffix,
        })
        break
      }

      case 'user.updated': {
        const updatePayload = {
          email: primaryEmail(data),
          phone: primaryPhone(data),
          display_name: deriveDisplayName(data),
          avatar_url: data.image_url ?? null,
        }
        let { error } = await supabaseAdmin
          .from('users')
          .update(updatePayload)
          .eq('id', data.id)

        // Same migration-38 fallback as the insert path: drop `phone` and
        // retry if the column doesn't exist in this environment yet.
        if (isMissingPhoneColumnError(error as PostgrestErrorLike | null)) {
          const { phone: _phone, ...payloadNoPhone } = updatePayload
          void _phone
          ;({ error } = await supabaseAdmin
            .from('users')
            .update(payloadNoPhone)
            .eq('id', data.id))
        }

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
