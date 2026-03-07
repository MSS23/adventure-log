/**
 * API endpoint for error monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtmlServer } from '@/lib/utils/html-escape'
import { log } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { events } = await request.json()

    if (!Array.isArray(events) || events.length > 50) {
      return NextResponse.json({ error: 'Invalid events format' }, { status: 400 })
    }

    // Sanitize and validate events
    const sanitizedEvents = events.map(event => ({
      message: escapeHtmlServer(event.message || ''),
      stack: event.stack ? escapeHtmlServer(event.stack) : null,
      url: event.url ? escapeHtmlServer(event.url) : null,
      line_number: event.lineNumber || null,
      column_number: event.columnNumber || null,
      user_id: event.userId || null,
      user_agent: event.userAgent ? escapeHtmlServer(event.userAgent) : null,
      timestamp: event.timestamp || new Date().toISOString(),
      severity: event.severity || 'medium',
      context: event.context || {},
      tags: event.tags || [],
      session_id: event.context?.sessionId || null,
    }))

    // Store in database if configured
    if (process.env.NODE_ENV === 'production') {
      const supabase = await createClient()

      const { error } = await supabase
        .from('error_logs')
        .insert(sanitizedEvents)

      if (error) {
        log.error('Failed to store error logs', { component: 'ErrorMonitoring', action: 'store' }, error)
        // Don't fail the request, just log the error
      }
    } else {
      // In development, use structured logger
      sanitizedEvents.forEach(event => {
        log.error('Client error received', {
          component: 'ErrorMonitoring',
          action: 'dev-log',
          message: event.message,
          severity: event.severity
        })
      })
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    log.error('Error processing error events', { component: 'ErrorMonitoring', action: 'process' }, error as Error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}