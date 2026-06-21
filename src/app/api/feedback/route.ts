import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { sanitizeText } from '@/lib/utils/input-validation'
import { log } from '@/lib/utils/logger'
import { deliverToDiscord, deliverToLinear } from '@/lib/services/feedback-delivery'

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']).default('other'),
  message: z.string().trim().min(3, 'Please add a bit more detail').max(4000),
  email: z.string().trim().email('Enter a valid email').max(254).optional().or(z.literal('')),
  pageUrl: z.string().trim().max(2048).optional(),
  appVersion: z.string().trim().max(32).optional(),
})

export async function POST(request: NextRequest) {
  // Strict rate limit — 10 submissions/hour per IP.
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.moderation, keyPrefix: 'feedback' })
  if (!rl.success) return rateLimitResponse(rl.reset)

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = feedbackSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid feedback' },
      { status: 400 }
    )
  }
  const data = parsed.data

  // Feedback works signed-in or anonymous; attach identity when available.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let username: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    username = profile?.username ?? null
  }

  const payload = {
    category: data.category,
    message: sanitizeText(data.message),
    email: data.email ? sanitizeText(data.email) : null,
    pageUrl: data.pageUrl ? sanitizeText(data.pageUrl) : null,
    userAgent: request.headers.get('user-agent')?.slice(0, 512) || null,
    appVersion: data.appVersion || null,
    username,
    userId: user?.id ?? null,
  }

  // 1) Durable record first. Persist via the user-scoped (RLS-bound) client so
  //    feedback is stored even when SUPABASE_SERVICE_ROLE_KEY is not configured;
  //    the feedback_insert_own policy permits a signed-in or anonymous self-insert.
  //    Fall back to the service-role client if the RLS write is rejected.
  let feedbackId: string | undefined
  const insertRow = {
    user_id: payload.userId,
    email: payload.email,
    category: payload.category,
    message: payload.message,
    page_url: payload.pageUrl,
    user_agent: payload.userAgent,
    app_version: payload.appVersion,
  }

  const { data: row, error } = await supabase
    .from('feedback')
    .insert(insertRow)
    .select('id')
    .single()
  if (error) {
    if (supabaseAdmin) {
      const { data: adminRow, error: adminError } = await supabaseAdmin
        .from('feedback')
        .insert(insertRow)
        .select('id')
        .single()
      if (adminError) {
        log.warn('Failed to persist feedback row', { component: 'FeedbackAPI', action: 'insert', error: adminError.message })
      } else {
        feedbackId = adminRow.id
      }
    } else {
      log.warn('Failed to persist feedback row', { component: 'FeedbackAPI', action: 'insert', error: error.message })
    }
  } else {
    feedbackId = row.id
  }

  // 2) Best-effort fan-out to Discord + Linear in parallel.
  const [discordOk, linear] = await Promise.all([
    deliverToDiscord({ ...payload, id: feedbackId }),
    deliverToLinear({ ...payload, id: feedbackId }),
  ])

  // 3) Record delivery outcomes against the stored row.
  if (supabaseAdmin && feedbackId) {
    const { error } = await supabaseAdmin
      .from('feedback')
      .update({
        delivered_discord: discordOk,
        delivered_linear: !!linear,
        linear_issue_id: linear?.id ?? null,
        linear_issue_url: linear?.url ?? null,
      })
      .eq('id', feedbackId)
    if (error) {
      log.warn('Failed to update feedback delivery', { component: 'FeedbackAPI', action: 'update', error: error.message })
    }
  }

  log.info('Feedback received', {
    component: 'FeedbackAPI',
    action: 'submit',
    category: data.category,
    discordOk,
    linearOk: !!linear,
    persisted: !!feedbackId,
    userId: payload.userId || undefined,
  })

  return NextResponse.json({ ok: true, id: feedbackId ?? null }, { status: 201 })
}
