/**
 * API endpoint for security monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { securityUtils } from '@/lib/config/security'

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
      message: securityUtils.sanitizeInput(event.message || ''),
      ip: event.ip || null,
      user_agent: event.userAgent ? securityUtils.sanitizeInput(event.userAgent) : null,
      path: event.path || null,
      user_id: event.userId || null,
      timestamp: event.timestamp || new Date().toISOString(),
      severity: ['low', 'medium', 'high', 'critical'].includes(event.severity)
        ? event.severity
        : 'medium',
      context: event.context || {},
    }))

    // Store in database if configured
    if (process.env.NODE_ENV === 'production') {
      const supabase = createClient()

      const { error } = await supabase
        .from('security_logs')
        .insert(sanitizedEvents)

      if (error) {
        console.error('Failed to store security logs:', error)
        // Don't fail the request, just log the error
      }

      // Check for critical security events that need immediate alerting
      const criticalEvents = sanitizedEvents.filter(event => event.severity === 'critical')
      if (criticalEvents.length > 0) {
        // TODO: Send alerts to security team
        console.error('🚨 CRITICAL SECURITY EVENTS:', criticalEvents)
      }
    } else {
      // In development, log to console
      console.group('🛡️ Security Events Received')
      sanitizedEvents.forEach(event => {
        const emoji = event.severity === 'critical' ? '🚨' : event.severity === 'high' ? '⚠️' : 'ℹ️'
        console.warn(`${emoji} ${event.type}:`, event)
      })
      console.groupEnd()
    }

    return NextResponse.json({ success: true, count: sanitizedEvents.length })
  } catch (error) {
    console.error('Error processing security events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}