/**
 * Shared Discord incoming-webhook transport. Server-only.
 *
 * Both feedback and moderation-report delivery post embeds; this owns the
 * fetch/error/timeout mechanics so hardening lands in one place.
 */

import { log } from '@/lib/utils/logger'

export interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string }
}

// A hung webhook must never pin a request or serverless instance for the
// full function timeout; delivery is best-effort.
const WEBHOOK_TIMEOUT_MS = 3000

/** Posts one embed to a Discord incoming webhook. Best-effort: returns false on any failure. */
export async function postDiscordEmbed(
  url: string,
  username: string,
  embed: DiscordEmbed,
  logCtx: { component: string; action: string }
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, embeds: [embed] }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
    if (!res.ok) {
      log.warn('Discord webhook returned non-OK', { ...logCtx, status: res.status })
      return false
    }
    return true
  } catch (error) {
    log.error('Discord webhook failed', logCtx, error as Error)
    return false
  }
}
