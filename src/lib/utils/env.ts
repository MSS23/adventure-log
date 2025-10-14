/**
 * Environment variable validation
 * Ensures all required env vars are present at build time
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Optional
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

const processEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

// Validate environment variables
export function validateEnv() {
  try {
    envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    })

    processEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
    })

    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      const zodError = error as z.ZodError
      zodError.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment variables')
    }
    throw error
  }
}

// Export validated env vars with type safety
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  mapbox: {
    accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const
