/**
 * API endpoint for performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtmlServer } from '@/lib/utils/html-escape'
import { log } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!Array.isArray(events) || events.length > 50) {
      return NextResponse.json({ error: 'Invalid events format or too many events' }, { status: 400 })
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

          log.info('Performance logs table not available, logging to console instead', { component: 'PerformanceMonitoring', action: 'store-fallback' })

          // Fallback to console logging
          sanitizedEvents.forEach(event => {
            log.info(`${event.name}: ${event.value}${event.unit}`, { component: 'PerformanceMonitoring', action: 'log-event', ...event })
          })
        } else {
          log.error('Performance monitoring error', { component: 'PerformanceMonitoring', action: 'store' }, error as Error)
        }
      } else if (process.env.NODE_ENV === 'development') {
        // In development, also log for debugging
        sanitizedEvents.forEach(event => {
          log.info(`${event.name}: ${event.value}${event.unit}`, { component: 'PerformanceMonitoring', action: 'log-event-dev', ...event })
        })
      }
    } catch (dbError) {
      log.warn('Performance monitoring database connection error (non-critical)', { component: 'PerformanceMonitoring', action: 'db-connection' }, dbError as Error)

      // Fallback to console logging
      sanitizedEvents.forEach(event => {
        log.info(`${event.name}: ${event.value}${event.unit}`, { component: 'PerformanceMonitoring', action: 'log-event-fallback', ...event })
      })
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    log.error('Error processing performance events', { component: 'PerformanceMonitoring', action: 'process' }, error as Error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}