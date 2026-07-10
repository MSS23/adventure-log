/**
 * One-click email unsubscribe tokens.
 *
 * Server-only (node:crypto). Links in email footers carry
 * `?uid=<userId>&sig=<hmac>` so a recipient can opt out without logging in;
 * the HMAC stops anyone from unsubscribing arbitrary users by guessing IDs.
 *
 * Keyed off EMAIL_UNSUBSCRIBE_SECRET, falling back to CRON_SECRET so no new
 * env var is required for the feature to work.
 */

import { createHmac } from 'node:crypto'
import { timingSafeStringEqual } from '@/lib/utils/bearer'

// EMAIL_UNSUBSCRIBE_SECRET should be set in production and NEVER rotated:
// signatures must stay valid for the lifetime of every email ever sent
// (links sit in inboxes for years). The CRON_SECRET fallback exists so the
// feature works in dev without extra setup, but coupling to a routinely
// rotatable bearer secret is not safe long-term — rotating it would 400
// every previously-emailed unsubscribe link.
function secret(): string | null {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null
}

/** HMAC signature for a user's unsubscribe link. Null when unconfigured. */
export function signUnsubscribe(userId: string): string | null {
  const key = secret()
  if (!key) return null
  return createHmac('sha256', key).update(`unsubscribe:${userId}`).digest('hex')
}

/** Constant-time verification of an unsubscribe signature. */
export function verifyUnsubscribe(userId: string, sig: string): boolean {
  const expected = signUnsubscribe(userId)
  if (!expected || !sig) return false
  return timingSafeStringEqual(expected, sig)
}

/** Absolute unsubscribe URL for a user, or null when unconfigured. */
export function buildUnsubscribeUrl(appUrl: string, userId: string): string | null {
  const sig = signUnsubscribe(userId)
  if (!sig) return null
  return `${appUrl}/api/email/unsubscribe?uid=${encodeURIComponent(userId)}&sig=${sig}`
}
