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

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid events format' }, { status: 400 })
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

      // Check for critical security events that need immediate alerting
      const criticalEvents = sanitizedEvents.filter(event => event.severity === 'critical')
      if (criticalEvents.length > 0) {
        // TODO: Send alerts to security team
        log.error('CRITICAL SECURITY EVENTS detected', { component: 'SecurityMonitoring', action: 'critical-alert', events: criticalEvents })
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