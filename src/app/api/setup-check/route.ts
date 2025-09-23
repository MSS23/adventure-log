import { NextResponse } from 'next/server'
import { healthCheck, supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const checks: {
      environment: ReturnType<typeof checkEnvironmentVariables>
      database: Awaited<ReturnType<typeof healthCheck.checkDatabase>> | null
      storage: Awaited<ReturnType<typeof healthCheck.checkStorage>> | null
      buckets: Awaited<ReturnType<typeof checkBucketSetup>> | null
      overall: boolean
    } = {
      environment: checkEnvironmentVariables(),
      database: null,
      storage: null,
      buckets: null,
      overall: false
    }

    // Only run Supabase checks if we have the required env vars
    if (checks.environment.hasRequired) {
      checks.database = await healthCheck.checkDatabase()
      checks.storage = await healthCheck.checkStorage()
      checks.buckets = await checkBucketSetup()
    }

    checks.overall = checks.environment.hasRequired &&
                    (checks.database?.healthy ?? false) &&
                    (checks.storage?.healthy ?? false) &&
                    (checks.buckets?.configured ?? false)

    return NextResponse.json({
      status: checks.overall ? 'ready' : 'setup_required',
      timestamp: new Date().toISOString(),
      checks,
      nextSteps: checks.overall ? null : generateNextSteps(checks)
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      nextSteps: ['Check server logs for detailed error information']
    }, { status: 500 })
  }
}

function checkEnvironmentVariables() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
  }

  const optional = {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  return {
    required,
    optional,
    hasRequired: missing.length === 0,
    missing
  }
}

async function checkBucketSetup() {
  try {
    if (!supabaseAdmin) {
      return {
        configured: false,
        error: 'Supabase admin client not available - missing service role key'
      }
    }

    const buckets = await supabaseAdmin.storage.listBuckets()

    if (buckets.error) {
      return {
        configured: false,
        error: buckets.error.message
      }
    }

    const requiredBuckets = ['photos', 'avatars']
    const existingBuckets = buckets.data.map(b => b.id)
    const missingBuckets = requiredBuckets.filter(id => !existingBuckets.includes(id))

    const bucketsConfig: Record<string, {
      exists: boolean
      public: boolean
      fileSizeLimit?: number | null
      allowedMimeTypes?: string[] | null
    }> = {}
    for (const bucket of buckets.data) {
      if (requiredBuckets.includes(bucket.id)) {
        bucketsConfig[bucket.id] = {
          exists: true,
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types
        }
      }
    }

    return {
      configured: missingBuckets.length === 0,
      existingBuckets,
      missingBuckets,
      bucketsConfig
    }

  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Failed to check buckets'
    }
  }
}

function generateNextSteps(checks: {
  environment: { hasRequired: boolean; missing: string[] }
  database?: { healthy: boolean } | null
  buckets?: { configured: boolean; missingBuckets?: string[] } | null
}): string[] {
  const steps: string[] = []

  if (!checks.environment.hasRequired) {
    steps.push('❌ Configure missing environment variables:')
    checks.environment.missing.forEach((env: string) => {
      steps.push(`   • ${env}`)
    })
    steps.push('   📖 See SUPABASE_SETUP.md for details')
  }

  if (checks.database && !checks.database.healthy) {
    steps.push('❌ Database setup required:')
    steps.push('   • Run the 4 SQL files in order (01-core-schema.sql → 04-functions-and-views.sql)')
    steps.push('   • Check Supabase SQL Editor for errors')
  }

  if (checks.buckets && !checks.buckets.configured) {
    steps.push('❌ Storage buckets setup required:')
    if (checks.buckets.missingBuckets && checks.buckets.missingBuckets.length > 0) {
      checks.buckets.missingBuckets.forEach((bucket: string) => {
        steps.push(`   • Create "${bucket}" bucket in Supabase Storage`)
      })
    }
    steps.push('   • Configure storage policies (see SUPABASE_SETUP.md)')
  }

  if (steps.length === 0) {
    steps.push('✅ All checks passed! Your Adventure Log is ready.')
  }

  return steps
}

// Health check for admins to verify setup
export async function POST() {
  try {
    // Run comprehensive diagnostics
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        env: checkEnvironmentVariables(),
        db: await healthCheck.checkDatabase(),
        storage: await healthCheck.checkStorage(),
        buckets: await checkBucketSetup()
      }
    }

    return NextResponse.json({
      status: 'diagnostics',
      data: diagnostics
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}