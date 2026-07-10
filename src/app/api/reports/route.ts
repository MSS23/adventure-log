import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'
import { sanitizeText } from '@/lib/utils/input-validation'
import { deliverReportToDiscord } from '@/lib/services/report-delivery'
import type { ReportReason, ReportTargetType } from '@/types/database'

const VALID_REASONS: ReportReason[] = ['spam', 'harassment', 'inappropriate', 'copyright', 'misinformation', 'other']
const VALID_TARGET_TYPES: ReportTargetType[] = ['user', 'album', 'photo', 'comment']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/reports
 * Create a new content/user report.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitAsync(request, { ...rateLimitConfigs.api, keyPrefix: 'report-create' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { target_type, target_id, reported_user_id, reason, description } = body as {
      target_type: ReportTargetType
      target_id: string
      reported_user_id?: string
      reason: ReportReason
      description?: string
    }

    // Validate required fields
    if (!target_type || !target_id || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: target_type, target_id, reason' },
        { status: 400 }
      )
    }

    // Validate target_type
    if (!VALID_TARGET_TYPES.includes(target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate reason
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      )
    }

    // target_id must be a UUID string — reject anything else before it
    // reaches the query (a non-string produces a malformed filter/500).
    if (typeof target_id !== 'string' || !UUID_RE.test(target_id)) {
      return NextResponse.json({ error: 'Invalid target_id' }, { status: 400 })
    }

    // Derive the reported user from the target SERVER-SIDE. The client-sent
    // `reported_user_id` is deliberately ignored: trusting it let a reporter
    // attribute someone else's content to an innocent user, planting false
    // moderation-queue records against them. If RLS hides the target row
    // from the reporter, we store null and moderators resolve it from the
    // target itself.
    void reported_user_id
    let derivedReportedUserId: string | null = null
    if (target_type === 'user') {
      derivedReportedUserId = target_id
    } else if (target_type === 'album') {
      const { data } = await supabase.from('albums').select('user_id').eq('id', target_id).maybeSingle()
      derivedReportedUserId = data?.user_id ?? null
    } else if (target_type === 'photo') {
      const { data } = await supabase.from('photos').select('user_id').eq('id', target_id).maybeSingle()
      derivedReportedUserId = data?.user_id ?? null
    } else if (target_type === 'comment') {
      const { data } = await supabase.from('comments').select('user_id').eq('id', target_id).maybeSingle()
      derivedReportedUserId = data?.user_id ?? null
    }

    // Cannot report yourself
    if (derivedReportedUserId === userId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 })
    }

    // Validate description length, then sanitize (it's shown to moderators —
    // strip any HTML so a report can't stored-XSS the moderation UI).
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
    }
    if (description && description.length > 1000) {
      return NextResponse.json({ error: 'Description must be 1000 characters or less' }, { status: 400 })
    }
    const cleanDescription = description ? sanitizeText(description) : null

    // Prevent duplicate reports from the same user for the same target
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', userId)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .in('status', ['pending', 'reviewing'])
      .maybeSingle()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already submitted a report for this content' },
        { status: 409 }
      )
    }

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        reporter_id: userId,
        reported_user_id: derivedReportedUserId,
        target_type,
        target_id,
        reason,
        description: cleanDescription,
        status: 'pending',
      })
      .select()
      .single()

    if (reportError) {
      log.error('Error creating report', { component: 'Reports', action: 'create' }, reportError)
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
    }

    // Best-effort moderation ping, delivered AFTER the response is sent
    // (after() maps to waitUntil on Vercel) so the reporter's 201 never
    // waits on Discord latency or outages.
    after(async () => {
      const discordOk = await deliverReportToDiscord({
        reportId: report.id,
        targetType: target_type,
        targetId: target_id,
        reason,
        description: cleanDescription,
        reportedUserId: derivedReportedUserId,
      })
      log.info('Report submitted', {
        component: 'Reports',
        action: 'submit',
        targetType: target_type,
        targetId: target_id,
        reason,
        discordOk,
      })
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/reports', { component: 'Reports', action: 'create' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
