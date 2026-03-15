/**
 * API endpoint for security monitoring
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
      type: ['rate_limit', 'suspicious_activity', 'auth_failure', 'upload_error'].includes(event.type)
        ? event.type
        : 'suspicious_activity',
      message: escapeHtmlServer(event.message || ''),
      ip: event.ip || null,
      user_agent: event.userAgent ? escapeHtmlServer(event.userAgent) : null,
      path: event.path ? escapeHtmlServer(event.path) : null,
      user_id: event.userId || null,
      timestamp: event.timestamp || new Date().toISOString(),
      severity: ['low', 'medium', 'high', 'critical'].includes(event.severity)
        ? event.severity
        : 'medium',
      context: event.context || {},
    }))

    // Store in database if configured
    if (process.env.NODE_ENV === 'production') {
      const supabase = await createClient()

      const { error } = await supabase
        .from('security_logs')
        .insert(sanitizedEvents)

      if (error) {
        log.error('Failed to store security logs', { component: 'SecurityMonitoring', action: 'store' }, error)
        // Don't fail the request, just log the error
      }

      // Alert on critical security events
      const criticalEvents = sanitizedEvents.filter(event => event.severity === 'critical')
      if (criticalEvents.length > 0) {
        // Log at error level with full context for monitoring/alerting systems (Sentry, log aggregators)
        for (const event of criticalEvents) {
          log.error(`CRITICAL SECURITY: [${event.type}] ${event.message}`, {
            component: 'SecurityMonitoring',
            action: 'critical-alert',
            eventType: event.type,
            path: event.path,
            userId: event.user_id,
            ip: event.ip,
            timestamp: event.timestamp,
          })
        }
      }
    } else {
      // In development, log security events
      sanitizedEvents.forEach(event => {
        log.warn(`Security event [${event.type}]`, { component: 'SecurityMonitoring', action: 'log-event-dev', ...event })
      })
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    log.error('Error processing security events', { component: 'SecurityMonitoring', action: 'process' }, error as Error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}