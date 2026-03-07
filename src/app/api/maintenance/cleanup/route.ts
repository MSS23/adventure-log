import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

const ALLOWED_JOBS = ['all', 'stories', 'notifications', 'activity_feed', 'storage'] as const
type CleanupJob = typeof ALLOWED_JOBS[number]

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
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
        // Run all cleanups
        const { data, error } = await supabaseAdmin.rpc('run_all_cleanups')
        if (error) throw error
        results = { cleanups: data }
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
        // Queue orphaned storage files
        const { data, error } = await supabaseAdmin.rpc('queue_orphaned_storage_cleanup')
        if (error) throw error
        results = { storage_queued: data }
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
    console.error('Cleanup job failed:', error)

    return NextResponse.json(
      {
        error: 'Cleanup job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support GET for simple cron services that only support GET
export async function GET(request: NextRequest) {
  return POST(request)
}
