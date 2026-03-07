import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

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
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
        // Capacitor not available, fall back to localStorage
      }

      // Web fallback
      localStorage.removeItem(key)
    },
  }
}

export function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: createStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}