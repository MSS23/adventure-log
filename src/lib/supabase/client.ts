import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Auth is owned by Supabase. The browser client manages the session itself
// (cookie/localStorage) and sends it on every request so RLS policies using
// auth.uid() can identify the caller.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

// Custom storage adapter that works on both web and native (Capacitor) platforms.
const createStorageAdapter = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (typeof window === 'undefined') return null
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          const { value } = await Preferences.get({ key })
          return value
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }
      return localStorage.getItem(key)
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (typeof window === 'undefined') return
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.set({ key, value })
          return
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }
      localStorage.setItem(key, value)
    },
    removeItem: async (key: string): Promise<void> => {
      if (typeof window === 'undefined') return
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences')
          await Preferences.remove({ key })
          return
        }
      } catch {
        // Capacitor not available, fall back to localStorage
      }
      localStorage.removeItem(key)
    },
  }
}

// Cache a single browser client instance. createClient() is frequently called
// inside component render bodies; returning a fresh instance each time gives an
// unstable reference that makes `useEffect`/`useCallback` dependency arrays fire
// on every render, causing infinite fetch loops that can hang the whole app.
let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }

  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: createStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

/** Whether Supabase env vars are configured. Safe to call at any time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
