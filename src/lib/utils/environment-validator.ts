/**
 * Environment Validation Utility
 *
 * Validates environment variables and configuration on application startup
 */

import { environmentValidation } from '@/lib/config/security'
import { log } from '@/lib/utils/logger'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    total: number
    required: number
    optional: number
    missing: number
    invalid: number
  }
}

export interface EnvironmentInfo {
  nodeEnv: string
  nextVersion: string
  platform: string
  architecture: string
  nodeVersion: string
  hasDocker: boolean
  isProduction: boolean
  isDevelopment: boolean
  isTest: boolean
}

/**
 * Get current environment information
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    nextVersion: process.env.npm_package_dependencies_next || 'unknown',
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    hasDocker: !!process.env.DOCKER_CONTAINER,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  }
}

/**
 * Validate a single environment variable
 */
function validateEnvironmentVariable(
  name: string,
  value: string | undefined,
  required: boolean
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if required variable is missing
  if (required && !value) {
    errors.push(`Missing required environment variable: ${name}`)
    return { valid: false, errors, warnings }
  }

  // Skip validation for optional missing variables
  if (!value) {
    return { valid: true, errors, warnings }
  }

  // Specific validations based on variable name
  switch (name) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      if (!value.match(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/)) {
        errors.push(`Invalid Supabase URL format: ${name}`)
      }
      break

    case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
    case 'SUPABASE_SERVICE_ROLE_KEY':
      if (value.length < 100) {
        warnings.push(`${name} seems too short, verify it's correct`)
      }
      break

    case 'NEXT_PUBLIC_SITE_URL':
      try {
        new URL(value)
      } catch {
        errors.push(`Invalid URL format for ${name}: ${value}`)
      }
      break

    case 'OPENWEATHER_API_KEY':
      if (value.length !== 32) {
        warnings.push(`${name} should be 32 characters long`)
      }
      break

    case 'NODE_ENV':
      if (!['development', 'production', 'test'].includes(value)) {
        warnings.push(`Unexpected NODE_ENV value: ${value}`)
      }
      break
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let invalidCount = 0

  const allVariables = [
    ...environmentValidation.required,
    ...environmentValidation.optional,
  ]

  // Validate each variable
  for (const varName of allVariables) {
    const isRequired = environmentValidation.required.includes(varName)
    const value = process.env[varName]
    const result = validateEnvironmentVariable(varName, value, isRequired)

    if (!result.valid) {
      invalidCount++
    }

    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  // Additional validations
  const envInfo = getEnvironmentInfo()

  // Check Node.js version
  const nodeVersion = process.version.replace('v', '')
  const majorVersion = parseInt(nodeVersion.split('.')[0])
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} is below recommended minimum (18+)`)
  }

  // Production-specific validations
  if (envInfo.isProduction) {
    // Allow VERCEL_URL as fallback for NEXT_PUBLIC_SITE_URL
    if (!process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_URL) {
      warnings.push('NEXT_PUBLIC_SITE_URL or VERCEL_URL should be set in production')
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
      errors.push('Production should not use localhost Supabase URL')
    }

    // SUPABASE_SERVICE_ROLE_KEY is only needed at runtime, not build time
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY not set - some server features may not work')
    }
  }

  // Development-specific validations
  if (envInfo.isDevelopment) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')) {
      warnings.push('Consider using a proper Supabase project URL in development')
    }
  }

  // Security validations
  for (const sensitiveVar of environmentValidation.sensitive) {
    const value = process.env[sensitiveVar]
    if (value && value.length < 20) {
      warnings.push(`${sensitiveVar} seems too short for a secure key`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: allVariables.length,
      required: environmentValidation.required.length,
      optional: environmentValidation.optional.length,
      missing: allVariables.filter(name => !process.env[name]).length,
      invalid: invalidCount,
    },
  }
}

/**
 * Log environment validation results
 */
export function logValidationResults(result: ValidationResult): void {
  const envInfo = getEnvironmentInfo()

  log.info('Environment Validation Report', {
    component: 'EnvironmentValidator',
    action: 'validation-report',
    environment: envInfo.nodeEnv,
    nodeVersion: envInfo.nodeVersion,
    platform: `${envInfo.platform} ${envInfo.architecture}`,
    docker: envInfo.hasDocker,
  })

  log.info('Environment validation summary', {
    component: 'EnvironmentValidator',
    action: 'validation-summary',
    totalVariables: result.summary.total,
    required: result.summary.required,
    optional: result.summary.optional,
    missing: result.summary.missing,
    invalid: result.summary.invalid,
  })

  if (result.errors.length > 0) {
    result.errors.forEach(error => {
      log.error(error, { component: 'EnvironmentValidator', action: 'validation-error' })
    })
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach(warning => {
      log.warn(warning, { component: 'EnvironmentValidator', action: 'validation-warning' })
    })
  }

  if (result.valid) {
    log.info('Environment validation passed', { component: 'EnvironmentValidator', action: 'validation-result' })
  } else {
    log.error('Environment validation failed - please fix errors before starting the application', {
      component: 'EnvironmentValidator',
      action: 'validation-result',
    })
  }
}

/**
 * Get masked environment variables for debugging
 */
export function getMaskedEnvironmentVariables(): Record<string, string> {
  const masked: Record<string, string> = {}

  const allVariables = [
    ...environmentValidation.required,
    ...environmentValidation.optional,
  ]

  for (const varName of allVariables) {
    const value = process.env[varName]
    if (!value) {
      masked[varName] = '[NOT SET]'
    } else if (environmentValidation.sensitive.includes(varName)) {
      // Mask sensitive variables
      masked[varName] = value.length > 8
        ? value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
        : '*'.repeat(value.length)
    } else {
      masked[varName] = value
    }
  }

  return masked
}

/**
 * Export environment variables to a safe configuration object
 */
export function getPublicEnvironmentConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    hasWeatherApi: !!process.env.OPENWEATHER_API_KEY,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  }
}

/**
 * Initialize environment validation (call this at app startup)
 */
export function initializeEnvironmentValidation(): boolean {
  const result = validateEnvironment()
  logValidationResults(result)

  // Don't exit during Vercel build - NEXT_PHASE indicates build vs runtime
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

  // In production runtime (not build), fail hard on validation errors
  if (!result.valid && process.env.NODE_ENV === 'production' && !isBuildPhase) {
    process.exit(1)
  }

  return result.valid
}

const environmentValidatorConfig = {
  validate: validateEnvironment,
  log: logValidationResults,
  getInfo: getEnvironmentInfo,
  getMasked: getMaskedEnvironmentVariables,
  getPublicConfig: getPublicEnvironmentConfig,
  initialize: initializeEnvironmentValidation,
}

export default environmentValidatorConfig