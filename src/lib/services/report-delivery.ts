/**
 * Content-report delivery — best-effort Discord notification so new reports
 * are seen promptly instead of sitting unread in the `reports` table (the
 * Online Safety Act complaints-handling duty expects timely review).
 *
 * Server-only. No-op when the env var is unset; a delivery failure never
 * breaks report submission. Reports get a DEDICATED webhook (no fallback to
 * the shared feedback channel) because report embeds carry reported-user IDs
 * and reporter free-text that belong in a moderation-scoped channel only.
 *
 * Env:
 *   DISCORD_REPORTS_WEBHOOK_URL – moderation channel incoming webhook
 */

import { postDiscordEmbed } from '@/lib/services/discord'
import type { ReportReason, ReportTargetType } from '@/types/database'

export interface ReportNotification {
  reportId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  description?: string | null
  reportedUserId?: string | null
}

const REASON_META: Record<ReportReason, { label: string; color: number }> = {
  spam: { label: 'Spam', color: 0xf59e0b },
  harassment: { label: 'Harassment', color: 0xdc2626 },
  inappropriate: { label: 'Inappropriate content', color: 0xdc2626 },
  copyright: { label: 'Copyright', color: 0x7c3aed },
  misinformation: { label: 'Misinformation', color: 0xf59e0b },
  other: { label: 'Other', color: 0x2563eb },
}

/** Posts a new content report to the moderation Discord channel. */
export async function deliverReportToDiscord(r: ReportNotification): Promise<boolean> {
  const url = process.env.DISCORD_REPORTS_WEBHOOK_URL
  if (!url) return false

  const meta = REASON_META[r.reason] ?? REASON_META.other
  const fields = [
    { name: 'Target', value: `${r.targetType} \`${r.targetId}\``, inline: false },
    ...(r.reportedUserId
      ? [{ name: 'Reported user', value: `\`${r.reportedUserId}\``, inline: false }]
      : []),
    { name: 'Report ID', value: `\`${r.reportId}\``, inline: false },
  ]

  return postDiscordEmbed(
    url,
    'Adventure Log Moderation',
    {
      title: `🚨 New report: ${meta.label}`,
      description: (r.description || '_No description provided._').slice(0, 4000),
      color: meta.color,
      fields,
      footer: { text: 'Review in Supabase → reports table' },
    },
    { component: 'ReportDelivery', action: 'discord' }
  )
}
