/**
 * Web Vitals Monitoring API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    // Anonymous telemetry: userId may be null (signed-out visitors still
    // generate Web Vitals). Don't 401 — just record the metric without an
    // owner. Middleware allowlists this route in PUBLIC_API_PATHS.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Validate the incoming data
    const {
      name,
      value,
      rating,
      url,
      timestamp
    } = body

    if (!name || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, value' },
        { status: 400 }
      )
    }

    // In a real application, you would store this in your database
    // For now, we'll just log it and return success
    log.info('Web Vital collected', {
      component: 'WebVitals',
      action: 'collect',
      name,
      value,
      rating,
      url: url?.split('?')[0], // Remove query params for privacy
      userId: userId || 'anonymous',
      timestamp: new Date(timestamp).toISOString()
    })

    // Optional: Store in database for analytics
    // const supabase = await createClient()
    // await supabase.from('web_vitals').insert({
    //   metric_name: name,
    //   metric_value: value,
    //   rating,
    //   url: url?.split('?')[0],
    //   user_agent: userAgent,
    //   session_id: sessionId,
    //   created_at: new Date(timestamp).toISOString()
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Error processing web vitals', { component: 'WebVitals', action: 'process' }, error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}