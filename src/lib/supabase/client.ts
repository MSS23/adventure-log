import { createBrowserClient } from '@supabase/ssr'
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// Auth is owned by Supabase. The browser client manages the session itself
// (cookie/localStorage) and sends it on every request so RLS policies using
// auth.uid() can identify the caller.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

/**
 * Durable auth storage for the native shell.
 *
 * This must be used with `@supabase/supabase-js` directly. The SSR package's
 * `createBrowserClient()` always replaces `auth.storage` with its own cookie
 * adapter, even when a custom adapter is supplied. Cookies are the right
 * contract for the website, but they are not a durable session store for the
 * `capacitor://localhost` WebView and caused the APK to appear to sign in and
 * then immediately fall back to the login screen.
 */
export function createNativeStorageAdapter(): SupportedStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      const { value } = await Preferences.get({ key })
      return value
    },
    async setItem(key: string, value: string): Promise<void> {
      await Preferences.set({ key, value })
    },
    async removeItem(key: string): Promise<void> {
      await Preferences.remove({ key })
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

  if (Capacitor.isNativePlatform()) {
    browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: createNativeStorageAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        // Native OAuth is completed explicitly by NativeAppShell from the
        // custom-scheme appUrlOpen callback. Letting auth-js inspect the local
        // WebView URL can incorrectly treat an ordinary app navigation as an
        // auth callback.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  } else {
    // Website/PWA: @supabase/ssr owns the cookie contract used by middleware
    // and Server Components. Do not share the native Preferences adapter here.
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

/** Whether Supabase env vars are configured. Safe to call at any time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
