import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/utils/logger'
import { verifyBearer } from '@/lib/utils/bearer'

/**
 * Maintenance Cleanup API Endpoint
 *
 * This endpoint runs database cleanup functions. It's designed to be called
 * by external schedulers (e.g., Vercel Cron, AWS Lambda) if pg_cron is not available.
 *
 * Authentication: Requires CRON_SECRET environment variable to match
 * the Authorization header to prevent unauthorized access.
 *
 * Schedule recommendations:
 * - Daily at 3 AM UTC: Full cleanup (no specific job parameter)
 * - Hourly: Stories cleanup only (job=stories)
 */

const ALLOWED_JOBS = ['all', 'stories', 'notifications', 'activity_feed', 'storage', 'drain_storage'] as const
type CleanupJob = typeof ALLOWED_JOBS[number]

interface QueueRow {
  id: string
  storage_bucket: string
  file_path: string
}

/**
 * Convert a queued value into a bucket-relative storage path. Photo paths are
 * already relative; avatar/story values may be full public URLs, so strip the
 * `…/object/public/<bucket>/` prefix.
 */
function toStoragePath(bucket: string, raw: string): string | null {
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+/, '')
  for (const marker of [`/storage/v1/object/public/${bucket}/`, `/public/${bucket}/`, `/${bucket}/`]) {
    const idx = raw.indexOf(marker)
    if (idx >= 0) return raw.slice(idx + marker.length)
  }
  return null
}

/**
 * Drain storage_cleanup_queue: actually remove the orphaned files (deleted
 * users' photos/avatars, expired story media) from storage and mark the rows
 * done. This is the step that makes account-deletion erasure real.
 *
 * Typed as `any` because `storage_cleanup_queue` isn't in the generated DB
 * types (same reason the `.rpc()` calls above are untyped).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function drainStorageQueue(db: any) {
  const { data: rows, error } = (await db
    .from('storage_cleanup_queue')
    .select('id, storage_bucket, file_path')
    .eq('status', 'pending')
    .limit(1000)) as { data: QueueRow[] | null; error: { message: string } | null }

  if (error) throw error
  if (!rows || rows.length === 0) return { processed: 0, removed: 0, failed: 0 }

  const byBucket = new Map<string, Array<{ id: string; path: string | null }>>()
  for (const r of rows) {
    const path = toStoragePath(r.storage_bucket, r.file_path)
    const list = byBucket.get(r.storage_bucket) ?? []
    list.push({ id: r.id, path })
    byBucket.set(r.storage_bucket, list)
  }

  const completedIds: string[] = []
  const failed: Array<{ id: string; msg: string }> = []
  const nowIso = new Date().toISOString()

  for (const [bucket, items] of byBucket) {
    for (const it of items.filter((i) => !i.path)) {
      failed.push({ id: it.id, msg: 'Unresolvable storage path' })
    }
    const valid = items.filter((i) => i.path) as Array<{ id: string; path: string }>
    if (valid.length === 0) continue

    const { error: rmError } = await db.storage
      .from(bucket)
      .remove(valid.map((v) => v.path))

    if (rmError) {
      for (const v of valid) failed.push({ id: v.id, msg: String(rmError.message).slice(0, 500) })
    } else {
      for (const v of valid) completedIds.push(v.id)
    }
  }

  if (completedIds.length > 0) {
    await db
      .from('storage_cleanup_queue')
      .update({ status: 'completed', processed_at: nowIso })
      .in('id', completedIds)
  }
  for (const f of failed) {
    await db
      .from('storage_cleanup_queue')
      .update({ status: 'failed', error_message: f.msg, processed_at: nowIso })
      .eq('id', f.id)
  }

  return { processed: rows.length, removed: completedIds.length, failed: failed.length }
}

export async function POST(request: NextRequest) {
  // Verify authorization. Secret env var: CRON_SECRET.
  // Use a constant-time comparison so the response time can't be used to
  // brute-force the secret one byte at a time.
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (!verifyBearer(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get job parameter
  const { searchParams } = new URL(request.url)
  const job = (searchParams.get('job') || 'all') as CleanupJob

  if (!ALLOWED_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `Invalid job. Allowed: ${ALLOWED_JOBS.join(', ')}` },
      { status: 400 }
    )
  }

  // Create admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const startTime = Date.now()
    let results: Record<string, unknown> = {}

    switch (job) {
      case 'all': {
        // Run all cleanups (queues orphaned storage first), then actually
        // delete the queued files from storage.
        const { data, error } = await supabaseAdmin.rpc('run_all_cleanups')
        if (error) throw error
        const storageDrain = await drainStorageQueue(supabaseAdmin)
        results = { cleanups: data, storage_drain: storageDrain }
        break
      }

      case 'stories': {
        // Cleanup expired stories only
        const { data, error } = await supabaseAdmin.rpc('cleanup_expired_stories')
        if (error) throw error
        results = { stories: data }
        break
      }

      case 'notifications': {
        // Cleanup old notifications only
        const { data, error } = await supabaseAdmin.rpc('cleanup_old_notifications')
        if (error) throw error
        results = { notifications: data }
        break
      }

      case 'activity_feed': {
        // Cleanup old activity feed only
        const { data, error } = await supabaseAdmin.rpc('cleanup_old_activity_feed')
        if (error) throw error
        results = { activity_feed: { deleted_count: data } }
        break
      }

      case 'storage': {
        // Queue orphaned storage files, then drain them.
        const { data, error } = await supabaseAdmin.rpc('queue_orphaned_storage_cleanup')
        if (error) throw error
        const storageDrain = await drainStorageQueue(supabaseAdmin)
        results = { storage_queued: data, storage_drain: storageDrain }
        break
      }

      case 'drain_storage': {
        // Just delete already-queued files (no re-queue).
        results = { storage_drain: await drainStorageQueue(supabaseAdmin) }
        break
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      job,
      results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    log.error('Cleanup job failed', { component: 'Maintenance', action: 'cleanup', job }, error as Error)

    return NextResponse.json(
      {
        error: 'Cleanup job failed'
      },
      { status: 500 }
    )
  }
}

// Also support GET for simple cron services that only support GET
export async function GET(request: NextRequest) {
  return POST(request)
}
