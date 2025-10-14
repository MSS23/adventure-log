/**
 * API endpoint for performance monitoring
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
      name: escapeHtmlServer(event.name || ''),
      value: typeof event.value === 'number' ? event.value : 0,
      unit: ['ms', 'bytes', 'count'].includes(event.unit) ? event.unit : 'ms',
      timestamp: event.timestamp || new Date().toISOString(),
      url: event.url ? escapeHtmlServer(event.url) : null,
      user_id: event.userId || null,
      context: event.context || {},
      session_id: event.context?.sessionId || null,
    }))

    // Store in database with enhanced error handling
    try {
      const supabase = await createClient()

      // Try to insert performance logs
      const { error } = await supabase
        .from('performance_logs')
        .insert(sanitizedEvents)

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST106' ||
            error.code === '42P01' ||
            error.message?.includes('relation') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('table') ||
            error.message?.includes('performance_logs')) {

          console.info('Performance logs table not available, logging to console instead')

          // Fallback to console logging
          console.group('📊 Performance Events (DB unavailable)')
          sanitizedEvents.forEach(event => {
            console.log(`${event.name}: ${event.value}${event.unit}`, event)
          })
          console.groupEnd()
        } else {
          console.error('Performance monitoring error:', error)
        }
      } else if (process.env.NODE_ENV === 'development') {
        // In development, also log to console for debugging
        console.group('📊 Performance Events (logged to DB)')
        sanitizedEvents.forEach(event => {
          console.log(`${event.name}: ${event.value}${event.unit}`, event)
        })
        console.groupEnd()
      }
    } catch (dbError) {
      console.warn('Performance monitoring database connection error (non-critical):', dbError)

      // Fallback to console logging
      console.group('📊 Performance Events (fallback)')
      sanitizedEvents.forEach(event => {
        console.log(`${event.name}: ${event.value}${event.unit}`, event)
      })
      console.groupEnd()
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    console.error('Error processing performance events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}