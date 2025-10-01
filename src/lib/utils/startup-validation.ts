/**
 * Startup Validation for Adventure Log
 *
 * Validates environment variables and system requirements during application startup
 */

import { securityUtils, environmentValidation } from '@/lib/config/security'

export interface StartupValidationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  environment: 'development' | 'production' | 'test'
  timestamp: string
}

/**
 * Validate all required environment variables
 */
function validateEnvironmentVariables(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Use the security utility for basic validation
  const baseValidation = securityUtils.validateEnvironment()
  errors.push(...baseValidation.errors)

  // Additional validations
  const requiredVars = environmentValidation.required
  const optionalVars = environmentValidation.optional

  // Check required variables exist and have valid formats
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`)
      return
    }

    // Specific format validations
    switch (varName) {
      case 'NEXT_PUBLIC_SUPABASE_URL':
        if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
          errors.push(`Invalid Supabase URL format: ${varName}`)
        }
        break

      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
      case 'SUPABASE_SERVICE_ROLE_KEY':
        if (value.length < 100) {
          errors.push(`${varName} appears to be too short (expected JWT format)`)
        }
        break
    }
  })

  // Check optional variables and warn if missing important ones
  optionalVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      if (varName === 'NEXT_PUBLIC_SITE_URL' && process.env.NODE_ENV === 'production') {
        warnings.push(`Missing ${varName} in production - this may affect OAuth redirects`)
      }
    }
  })

  // Environment-specific validations
  if (process.env.NODE_ENV === 'production') {
    // Production-specific checks
    if (!process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
      warnings.push('No site URL configured for production deployment')
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
      errors.push('Using localhost Supabase URL in production')
    }
  }

  return { errors, warnings }
}

/**
 * Validate system requirements
 */
function validateSystemRequirements(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check Node.js version
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])

  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Minimum required: 18.x`)
  } else if (majorVersion < 20) {
    warnings.push(`Node.js version ${nodeVersion} works but ${20}.x or higher is recommended`)
  }

  // Check memory limits
  if (process.env.NODE_OPTIONS?.includes('--max-old-space-size')) {
    const match = process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/)
    if (match) {
      const memoryLimit = parseInt(match[1])
      if (memoryLimit < 2048) {
        warnings.push(`Low memory limit configured: ${memoryLimit}MB. Consider increasing for better performance`)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Validate third-party service connectivity
 */
async function validateServiceConnectivity(): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate Supabase connection
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      })

      if (!response.ok) {
        errors.push(`Cannot connect to Supabase: HTTP ${response.status}`)
      }
    }
  } catch (error) {
    warnings.push(`Supabase connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { errors, warnings }
}

/**
 * Comprehensive startup validation
 */
export async function validateStartup(): Promise<StartupValidationResult> {
  const timestamp = new Date().toISOString()
  const environment = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'

  console.log(`🔍 Starting Adventure Log validation (${environment})...`)

  const allErrors: string[] = []
  const allWarnings: string[] = []

  // 1. Environment variables validation
  console.log('📋 Validating environment variables...')
  const envValidation = validateEnvironmentVariables()
  allErrors.push(...envValidation.errors)
  allWarnings.push(...envValidation.warnings)

  // 2. System requirements validation
  console.log('⚙️ Validating system requirements...')
  const sysValidation = validateSystemRequirements()
  allErrors.push(...sysValidation.errors)
  allWarnings.push(...sysValidation.warnings)

  // 3. Service connectivity validation (only in production)
  if (environment === 'production') {
    console.log('🌐 Validating service connectivity...')
    try {
      const serviceValidation = await validateServiceConnectivity()
      allErrors.push(...serviceValidation.errors)
      allWarnings.push(...serviceValidation.warnings)
    } catch (error) {
      allWarnings.push(`Service connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const success = allErrors.length === 0

  // Log results
  if (success) {
    console.log('✅ Startup validation completed successfully')
    if (allWarnings.length > 0) {
      console.log(`⚠️ ${allWarnings.length} warning(s):`)
      allWarnings.forEach(warning => console.log(`   • ${warning}`))
    }
  } else {
    console.error('❌ Startup validation failed')
    console.error(`Found ${allErrors.length} error(s):`)
    allErrors.forEach(error => console.error(`   • ${error}`))

    if (allWarnings.length > 0) {
      console.log(`⚠️ ${allWarnings.length} warning(s):`)
      allWarnings.forEach(warning => console.log(`   • ${warning}`))
    }
  }

  return {
    success,
    errors: allErrors,
    warnings: allWarnings,
    environment,
    timestamp
  }
}

/**
 * Environment variable validator for development
 */
export function validateDevelopmentSetup(): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const requiredForDev = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = requiredForDev.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    console.error('🚫 Development setup incomplete!')
    console.error('Missing required environment variables:')
    missing.forEach(varName => console.error(`   • ${varName}`))
    console.error('\n💡 Create a .env.local file with these variables.')
    console.error('📖 See .env.example for the template.')
    console.error('⚠️ Developer mode: Continuing without required variables. Some features may not work as expected.')
  }
}

/**
 * Quick environment check for critical variables
 */
export function quickEnvironmentCheck(): boolean {
  const critical = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  return critical.every(varName => !!process.env[varName])
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelUrl: process.env.VERCEL_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  }
}