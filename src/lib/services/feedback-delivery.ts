/**
 * Feedback delivery — best-effort fan-out to Linear and Discord.
 *
 * Server-only. Both destinations are independently optional: each is a no-op
 * when its env vars are missing, and every network call is wrapped so one
 * failing destination never breaks the other or the API request.
 *
 * Env:
 *   DISCORD_FEEDBACK_WEBHOOK_URL  – Discord incoming webhook URL
 *   LINEAR_API_KEY                – Linear personal API key (Settings → API)
 *   LINEAR_TEAM_ID                – target Linear team UUID
 *   LINEAR_FEEDBACK_LABEL_ID      – (optional) label UUID applied to issues
 */

import { log } from '@/lib/utils/logger'

export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other'

export interface FeedbackPayload {
  id?: string
  category: FeedbackCategory
  message: string
  email?: string | null
  pageUrl?: string | null
  userAgent?: string | null
  appVersion?: string | null
  username?: string | null
  userId?: string | null
}

const CATEGORY_META: Record<FeedbackCategory, { label: string; emoji: string; color: number }> = {
  bug: { label: 'Bug', emoji: '🐞', color: 0xdc2626 },
  idea: { label: 'Idea', emoji: '💡', color: 0xf59e0b },
  praise: { label: 'Praise', emoji: '💚', color: 0x16a34a },
  other: { label: 'Feedback', emoji: '✉️', color: 0x2563eb },
}

export function isDiscordConfigured(): boolean {
  return !!process.env.DISCORD_FEEDBACK_WEBHOOK_URL
}

export function isLinearConfigured(): boolean {
  return !!(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID)
}

function authorLabel(p: FeedbackPayload): string {
  if (p.username) return `@${p.username}`
  if (p.email) return p.email
  return 'anonymous'
}

/** Posts the feedback to a Discord channel via incoming webhook. */
export async function deliverToDiscord(p: FeedbackPayload): Promise<boolean> {
  const url = process.env.DISCORD_FEEDBACK_WEBHOOK_URL
  if (!url) return false

  const meta = CATEGORY_META[p.category] ?? CATEGORY_META.other
  const fields = [
    { name: 'From', value: authorLabel(p).slice(0, 256), inline: true },
    ...(p.email ? [{ name: 'Contact', value: p.email.slice(0, 256), inline: true }] : []),
    ...(p.pageUrl ? [{ name: 'Page', value: p.pageUrl.slice(0, 1024), inline: false }] : []),
  ]

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Adventure Log Feedback',
        embeds: [
          {
            title: `${meta.emoji} ${meta.label}`,
            description: p.message.slice(0, 4000),
            color: meta.color,
            fields,
            footer: { text: `Adventure Log${p.appVersion ? ` · v${p.appVersion}` : ''}` },
          },
        ],
      }),
    })
    if (!res.ok) {
      log.warn('Discord feedback webhook returned non-OK', {
        component: 'FeedbackDelivery',
        action: 'discord',
        status: res.status,
      })
      return false
    }
    return true
  } catch (error) {
    log.error('Discord feedback webhook failed', { component: 'FeedbackDelivery', action: 'discord' }, error as Error)
    return false
  }
}

/** Creates a Linear issue for the feedback. Returns the issue id + url. */
export async function deliverToLinear(p: FeedbackPayload): Promise<{ id: string; url: string } | null> {
  const apiKey = process.env.LINEAR_API_KEY
  const teamId = process.env.LINEAR_TEAM_ID
  if (!apiKey || !teamId) return null

  const meta = CATEGORY_META[p.category] ?? CATEGORY_META.other
  const firstLine = p.message.replace(/\s+/g, ' ').trim().slice(0, 80)
  const title = `[${meta.label}] ${firstLine}${p.message.length > 80 ? '…' : ''}`
  const description = [
    p.message,
    '',
    '---',
    `**From:** ${authorLabel(p)}`,
    p.email ? `**Contact:** ${p.email}` : '',
    p.pageUrl ? `**Page:** ${p.pageUrl}` : '',
    p.userId ? `**User ID:** \`${p.userId}\`` : '',
    p.appVersion ? `**App version:** ${p.appVersion}` : '',
    p.userAgent ? `**User agent:** ${p.userAgent}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const input: Record<string, unknown> = { teamId, title, description }
  const labelId = process.env.LINEAR_FEEDBACK_LABEL_ID
  if (labelId) input.labelIds = [labelId]

  const query = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }
  `

  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Personal API keys are sent in the Authorization header verbatim.
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { input } }),
    })

    const json = await res.json().catch(() => null)
    const issue = json?.data?.issueCreate?.issue
    if (!res.ok || json?.errors || !json?.data?.issueCreate?.success || !issue) {
      log.warn('Linear issue create failed', {
        component: 'FeedbackDelivery',
        action: 'linear',
        status: res.status,
        errors: json?.errors ? JSON.stringify(json.errors).slice(0, 500) : undefined,
      })
      return null
    }
    return { id: issue.id, url: issue.url }
  } catch (error) {
    log.error('Linear issue create failed', { component: 'FeedbackDelivery', action: 'linear' }, error as Error)
    return null
  }
}
