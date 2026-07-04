import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { uploadSecurity } from '@/lib/config/security'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/photos/upload-url
 *
 * Server-side gatekeeper for photo uploads. Files still upload directly to
 * Supabase Storage (to avoid serverless body limits on bulk/large uploads),
 * but a client must first obtain a short-lived signed upload URL here. That
 * lets us enforce, on the server:
 *   - authentication (401 if not signed in),
 *   - rate limiting (abuse protection),
 *   - album ownership (you can only upload into your own album),
 *   - a server-built storage path (no client-controlled path spoofing).
 *
 * Body: { albumId: string, contentType: string }
 * Returns: { path, token, moderationEnabled }
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Pro gate: photos per album. Free = 30, Pro = 4× (120).
const FREE_ALBUM_PHOTO_CAP = 30
const PRO_ALBUM_PHOTO_CAP = 120

export async function POST(request: NextRequest) {
  // Rate limit per IP (50/hr) before doing any work
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.upload, keyPrefix: 'photo-upload-url' })
  if (!rl.success) return rateLimitResponse(rl.reset)

  if (!supabaseAdmin) {
    log.error('Upload URL requested but admin client unavailable', {
      component: 'api/photos/upload-url',
      action: 'config',
    })
    return NextResponse.json({ error: 'Uploads are temporarily unavailable.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { albumId?: unknown; contentType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const albumId = typeof body.albumId === 'string' ? body.albumId : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : ''

  if (!UUID_RE.test(albumId)) {
    return NextResponse.json({ error: 'Invalid albumId' }, { status: 400 })
  }
  if (!uploadSecurity.allowedImageTypes.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }

  // Verify the album belongs to this user (RLS-respecting read).
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumError || !album || album.user_id !== user.id) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  // ── Pro gate: per-album photo cap (30 free / 120 pro) ─────────────────────
  const { data: planRow, error: planError } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  // Tolerate the plan column not existing yet (migration 69 not applied):
  // Postgres 42703 = undefined_column → treat the user as free. Likewise
  // 42501 = permission denied if migration 75's column-level grants are in
  // place without `plan` in the allowlist — same free-plan degradation.
  const plan = planError ? 'free' : (planRow?.plan ?? 'free')
  if (planError && planError.code !== '42703') {
    log.warn('Could not read user plan, treating as free', {
      component: 'api/photos/upload-url',
      action: 'plan-check',
      userId: user.id,
    })
  }

  const { count: photoCount, error: countError } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId)

  // Fail open on count errors — never block uploads because of a bad query.
  if (!countError && photoCount !== null) {
    if (plan !== 'pro' && photoCount >= FREE_ALBUM_PHOTO_CAP) {
      return NextResponse.json(
        {
          error: `Free plan albums hold up to ${FREE_ALBUM_PHOTO_CAP} photos — upgrade to Pro for 4× the capacity`,
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pro',
        },
        { status: 402 }
      )
    }
    if (plan === 'pro' && photoCount >= PRO_ALBUM_PHOTO_CAP) {
      return NextResponse.json(
        { error: `Albums hold up to ${PRO_ALBUM_PHOTO_CAP} photos — start a new album for the rest of the trip.` },
        { status: 400 }
      )
    }
  }

  // Server-controlled path: <userId>/<albumId>/<unique>.<ext>
  const ext = EXT_BY_MIME[contentType] || 'jpg'
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const path = `${user.id}/${albumId}/${unique}.${ext}`

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('photos')
    .createSignedUploadUrl(path)

  if (signError || !signed) {
    log.error('Failed to create signed upload URL', {
      component: 'api/photos/upload-url',
      action: 'sign',
      albumId,
    }, signError as Error)
    return NextResponse.json({ error: 'Could not start upload' }, { status: 500 })
  }

  const moderationEnabled =
    !!process.env.MODERATION_API_KEY && (process.env.MODERATION_PROVIDER || 'none') !== 'none'

  const res = NextResponse.json({ path: signed.path ?? path, token: signed.token, moderationEnabled })
  res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
  return res
}
