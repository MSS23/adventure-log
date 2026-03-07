import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  platform: string
  checks: {
    database: boolean
    redis?: boolean
    memory: {
      total: number
      used: number
      free: number
      percentage: number
    }
  }
  uptime: number
}

async function checkDatabase(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('users').select('count').limit(1)
    return !error
  } catch {
    return false
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return true // Skip if not configured

    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })

    await redis.ping()
    return true
  } catch {
    return false
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage()
  const total = usage.heapTotal
  const used = usage.heapUsed
  const free = total - used

  return {
    total,
    used,
    free,
    percentage: Math.round((used / total) * 100)
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  const [databaseHealthy, redisHealthy] = await Promise.all([
    checkDatabase(),
    checkRedis()
  ])

  const memory = getMemoryUsage()
  const uptime = process.uptime()

  const allHealthy = databaseHealthy && (redisHealthy ?? true)
  const status: 'healthy' | 'degraded' | 'unhealthy' =
    allHealthy ? 'healthy' :
    (databaseHealthy || redisHealthy) ? 'degraded' :
    'unhealthy'

  const responseTime = Date.now() - startTime

  const healthData: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.1.0',
    platform: 'adventure-log',
    checks: {
      database: databaseHealthy,
      ...(process.env.UPSTASH_REDIS_REST_URL && { redis: redisHealthy }),
      memory
    },
    uptime
  }

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503

  return NextResponse.json(healthData, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${responseTime}ms`
    }
  })
}