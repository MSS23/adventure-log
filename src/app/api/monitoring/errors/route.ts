/**
 * API endpoint for error monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtmlServer } from '@/lib/utils/html-escape'
import { log } from '@/lib/utils/logger'

// error_events.severity only allows these values (see 29_moderation_and_errors.sql).
// Map the client-side severity vocabulary onto them.
function mapSeverity(value: unknown): 'info' | 'warn' | 'error' | 'critical' {
  switch (value) {
    case 'low':
      return 'info'
    case 'medium':
      return 'warn'
    case 'high':
      return 'error'
    case 'info':
    case 'warn':
    case 'error':
    case 'critical':
      return value
    default:
      return 'error'
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { events } = await request.json()

    if (!Array.isArray(events) || events.length > 50) {
      return NextResponse.json({ error: 'Invalid events format' }, { status: 400 })
    }

    // Sanitize and map events onto the public.error_events table schema.
    // (line/column/tags/session_id have no column in error_events; the most
    // useful of those — source location — is folded into the message.)
    const sanitizedEvents = events.map(event => {
      const location =
        event.lineNumber != null
          ? ` (${event.url || 'unknown'}:${event.lineNumber}${event.columnNumber != null ? ':' + event.columnNumber : ''})`
          : ''
      return {
        user_id: userId,
        route: event.url ? escapeHtmlServer(event.url) : null,
        component: event.context?.component ? escapeHtmlServer(String(event.context.component)) : null,
        action: event.context?.action ? escapeHtmlServer(String(event.context.action)) : null,
        message: escapeHtmlServer((event.message || '') + location),
        stack: event.stack ? escapeHtmlServer(event.stack) : null,
        user_agent: event.userAgent ? escapeHtmlServer(event.userAgent) : null,
        severity: mapSeverity(event.severity),
        created_at: event.timestamp || new Date().toISOString(),
      }
    })

    // Store in database if configured
    if (process.env.NODE_ENV === 'production') {
      const { error } = await supabase
        .from('error_events')
        .insert(sanitizedEvents)

      if (error) {
        log.error('Failed to store error events', { component: 'ErrorMonitoring', action: 'store' }, error)
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