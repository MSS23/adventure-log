import { createBrowserClient, createServerClient as createSupabaseServerClient } from '@supabase/ssr'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Create a Supabase client for use in browser/client components
 * This client handles authentication state and real-time subscriptions
 */
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}

/**
 * Create a Supabase client for use in server components and API routes
 * This client handles server-side authentication and cookie management
 */
export async function createServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: object }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase admin client for server-side operations that bypass RLS
 * Use with caution - only for trusted server-side operations
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createBrowserClient(supabaseUrl!, serviceRoleKey)
}

// Type exports for better TypeScript support
export type SupabaseClient = ReturnType<typeof createClient>
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>

// Configuration constants
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
} as const