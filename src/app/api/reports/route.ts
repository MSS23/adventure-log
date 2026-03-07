import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'
import type { ReportReason, ReportTargetType } from '@/types/database'

const VALID_REASONS: ReportReason[] = ['spam', 'harassment', 'inappropriate', 'copyright', 'misinformation', 'other']
const VALID_TARGET_TYPES: ReportTargetType[] = ['user', 'album', 'photo', 'comment', 'story', 'message']

/**
 * POST /api/reports
 * Create a new content/user report.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'report-create' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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

    // Cannot report yourself
    if (reported_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 })
    }

    // Validate description length
    if (description && description.length > 1000) {
      return NextResponse.json({ error: 'Description must be 1000 characters or less' }, { status: 400 })
    }

    // Prevent duplicate reports from the same user for the same target
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
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
        reporter_id: user.id,
        reported_user_id: reported_user_id || null,
        target_type,
        target_id,
        reason,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single()

    if (reportError) {
      log.error('Error creating report', { component: 'Reports', action: 'create' }, reportError)
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
    }

    log.info('Report submitted', {
      component: 'Reports',
      action: 'submit',
      targetType: target_type,
      targetId: target_id,
      reason,
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    log.error('Unexpected error in POST /api/reports', { component: 'Reports', action: 'create' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
