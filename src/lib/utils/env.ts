/**
 * Environment variable validation
 * Ensures all required env vars are present at build time
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Clerk owns auth post-migration. Both keys are .optional() at the schema
  // level so `next build` doesn't throw in environments that don't have them
  // wired up yet (CI smoke builds, ephemeral preview deploys, mobile static
  // exports). Runtime validation lives in environment-validator.ts and Clerk
  // itself — the SDK throws a clear "Missing publishable key" error the first
  // time a request hits the middleware, which is the right failure surface.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, 'Clerk publishable key must start with pk_test_ or pk_live_')
    .optional(),
  CLERK_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, 'Clerk secret key must start with sk_test_ or sk_live_')
    .optional(),

  // Optional
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
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
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
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
    url: process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const
