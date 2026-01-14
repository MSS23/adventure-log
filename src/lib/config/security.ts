/**
 * Security Configuration for Adventure Log
 *
 * Centralized security settings and utilities for the application
 */

// Content Security Policy configuration
export const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    "https://va.vercel-scripts.com", // Vercel Analytics
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    "https://fonts.googleapis.com",
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:", // Allow images from HTTPS sources
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  ],
  'connect-src': [
    "'self'",
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    "https://api.openweathermap.org", // Weather API
    "wss:", // WebSocket connections
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
}

// Security headers configuration
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': Object.entries(cspConfig)
    .map(([key, values]) => {
      if (key === 'upgrade-insecure-requests') {
        return 'upgrade-insecure-requests'
      }
      return `${key} ${Array.isArray(values) ? values.join(' ') : values}`
    })
    .join('; '),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent content type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Permissions policy
  'Permissions-Policy': [
    'camera=(self)',
    'microphone=()',
    'geolocation=(self)',
    'interest-cohort=()',
  ].join(', '),
}

// Rate limiting configuration
export const rateLimitConfig = {
  // API routes rate limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Auth routes rate limits (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
  },

  // Upload routes rate limits
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit each IP to 50 uploads per hour
  },
}

// Input validation patterns
export const validationPatterns = {
  // Email pattern (RFC 5322 compliant)
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Strong password (8+ chars, uppercase, lowercase, number, special char)
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,

  // Username (alphanumeric, underscores, 3-20 chars)
  username: /^[a-zA-Z0-9_]{3,20}$/,

  // UUID pattern
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Safe filename (no path traversal)
  safeFilename: /^[a-zA-Z0-9._-]+$/,
}

// File upload security configuration
export const uploadSecurity = {
  // Maximum file size (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Allowed image MIME types
  allowedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],

  // Allowed file extensions
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],

  // Virus scanning enabled
  virusScanEnabled: process.env.NODE_ENV === 'production',

  // Image processing settings
  imageProcessing: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 85,
    stripMetadata: true, // Remove EXIF data for privacy
  },
}

// Authentication security settings
export const authSecurity = {
  // Session configuration
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // OAuth settings
  oauth: {
    allowedProviders: ['google', 'github'],
    requireEmailVerification: true,
  },

  // Two-factor authentication
  twoFactor: {
    enabled: false, // Can be enabled in future
    backupCodesCount: 8,
  },
}

// Database security configuration
export const databaseSecurity = {
  // Row Level Security policies
  rls: {
    enabled: true,
    strictMode: true,
  },

  // Connection security
  connection: {
    ssl: process.env.NODE_ENV === 'production',
    timeout: 30000, // 30 seconds
    maxConnections: 100,
  },

  // Query security
  query: {
    maxExecutionTime: 10000, // 10 seconds
    preventSqlInjection: true,
    sanitizeInputs: true,
  },
}

// Environment validation
export const environmentValidation = {
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],

  optional: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'OPENWEATHER_API_KEY',
    'VERCEL_URL',
  ],

  sensitive: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENWEATHER_API_KEY',
  ],
}

// Monitoring and alerting configuration
export const monitoringConfig = {
  // Error tracking
  errorTracking: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1, // 10% sampling
    maxErrorsPerMinute: 10,
  },

  // Performance monitoring
  performance: {
    enabled: true,
    sampleRate: 0.01, // 1% sampling
    vitalsTracking: true,
  },

  // Security monitoring
  security: {
    trackFailedLogins: true,
    trackSuspiciousActivity: true,
    alertThresholds: {
      failedLoginsPerMinute: 10,
      rateLimitExceeded: 5,
      suspiciousFileUploads: 3,
    },
  },
}

// Utility functions for security
export const securityUtils = {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  },

  /**
   * Validate environment variables on startup
   */
  validateEnvironment: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check required variables
    environmentValidation.required.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    })

    // Validate URL format for Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/)) {
      errors.push('Invalid Supabase URL format')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  /**
   * Check if a file upload is safe
   */
  validateFileUpload: (file: File): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check file size
    if (file.size > uploadSecurity.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${uploadSecurity.maxFileSize / 1024 / 1024}MB`)
    }

    // Check MIME type
    if (!uploadSecurity.allowedImageTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!uploadSecurity.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`)
    }

    // Check filename for safety
    if (!validationPatterns.safeFilename.test(file.name)) {
      errors.push('Filename contains unsafe characters')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  /**
   * Generate secure random string
   */
  generateSecureToken: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const randomArray = new Uint8Array(length)
    crypto.getRandomValues(randomArray)

    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length]
    }

    return result
  },
}

// Export default configuration
const securityConfig = {
  csp: cspConfig,
  headers: securityHeaders,
  rateLimit: rateLimitConfig,
  validation: validationPatterns,
  upload: uploadSecurity,
  auth: authSecurity,
  database: databaseSecurity,
  environment: environmentValidation,
  monitoring: monitoringConfig,
  utils: securityUtils,
}

export default securityConfig