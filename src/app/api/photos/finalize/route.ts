import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { moderateImageServer } from '@/lib/services/moderation'
import { log } from '@/lib/utils/logger'

/**
 * POST /api/photos/finalize
 *
 * Optional post-upload content moderation. The client only calls this when the
 * upload-url response reported `moderationEnabled: true` (i.e. a MODERATION_API
 * key/provider is configured), so there is ZERO overhead when moderation is
 * off. If the image is flagged, it is removed from storage and the client is
 * told not to create the photo record.
 *
 * Body: { path: string }   (storage key under the `photos` bucket)
 * Returns: { safe: boolean, reason?: string }
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    // Without the admin client we cannot delete flagged files; fail open.
    return NextResponse.json({ safe: true, flags: ['no_admin_client'] })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { path?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const path = typeof body.path === 'string' ? body.path : ''
  // Ownership guard: server-built paths are `<userId>/...`
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const { data: pub } = supabaseAdmin.storage.from('photos').getPublicUrl(path)
  const result = await moderateImageServer(pub.publicUrl)

  if (!result.safe) {
    await supabaseAdmin.storage.from('photos').remove([path])
    log.warn('Photo removed by server moderation', {
      component: 'api/photos/finalize',
      action: 'moderation-block',
      reason: result.reason,
      flags: result.flags,
      userId: user.id,
    })
    return NextResponse.json(
      { safe: false, reason: result.reason || 'This image did not pass our content checks.' },
      { status: 422 },
    )
  }

  return NextResponse.json({ safe: true })
}
