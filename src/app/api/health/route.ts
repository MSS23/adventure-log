import { NextResponse } from 'next/server'
import { healthCheck } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // Basic system health
    const systemHealth = {
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      environment: process.env.NODE_ENV,
    }

    // Supabase health checks (only in production)
    let supabaseHealth = null
    if (process.env.NODE_ENV === 'production' || process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        supabaseHealth = await healthCheck.checkOverall()
      } catch (error) {
        supabaseHealth = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Failed to check Supabase health'
        }
      }
    }

    const overallHealthy = !supabaseHealth || supabaseHealth.healthy

    return NextResponse.json({
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      system: systemHealth,
      supabase: supabaseHealth
    }, {
      status: overallHealthy ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503
    })
  }
}