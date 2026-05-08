import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Validated at call time (not at module import) so missing env vars don't
// crash the entire app at startup. Pages that don't use Supabase still
// render; the error message points the user at .env.local.
const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

// Custom storage adapter that works on both web and native platforms
const createStorageAdapter = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (typeof window === 'undefined') return null

      try {
        // Check if running in Capacitor native app
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          const { value } = await Preferences.get({ key })
          return value
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }

      // Web fallback
      return localStorage.getItem(key)
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (typeof window === 'undefined') return

      try {
        // Check if running in Capacitor native app
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.set({ key, value })
          return
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }

      // Web fallback
      localStorage.setItem(key, value)
    },
    removeItem: async (key: string): Promise<void> => {
      if (typeof window === 'undefined') return

      try {
        // Check if running in Capacitor native app
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.remove({ key })
          return
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }

      // Web fallback
      localStorage.removeItem(key)
    },
  }
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: createStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

/** Whether Supabase env vars are configured. Safe to call at any time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}