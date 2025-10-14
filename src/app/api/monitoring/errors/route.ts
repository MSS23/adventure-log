/**
 * API endpoint for error monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtmlServer } from '@/lib/utils/html-escape'

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!Array.isArray(events)) {
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
        console.error('Failed to store error logs:', error)
        // Don't fail the request, just log the error
      }
    } else {
      // In development, log to console
      console.group('🚨 Error Events Received')
      sanitizedEvents.forEach(event => {
        console.error('Error:', event)
      })
      console.groupEnd()
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    console.error('Error processing error events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}