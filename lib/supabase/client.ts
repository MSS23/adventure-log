/**
 * Supabase Client for Browser/Client-Side Usage
 * 
 * This client is designed for Next.js App Router with proper session management.
 * It handles authentication state, cookie persistence, and automatic token refresh.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Get or create the browser Supabase client
 * Uses singleton pattern to avoid multiple GoTrueClient warnings
 */
export function createClient() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Create new client instance
  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Enable automatic session persistence via cookies
      persistSession: true,
      // Automatically refresh tokens when they expire
      autoRefreshToken: true,
      // Don't detect OAuth callbacks in URL (handled by callback route)
      detectSessionInUrl: false,
      // Enhanced debugging in development
      debug: process.env.NODE_ENV === 'development',
      // Enhanced localStorage with error handling
      storage: {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null
          try {
            const value = window.localStorage.getItem(key)
            if (process.env.NODE_ENV === 'development' && key.includes('supabase')) {
              console.debug(`[Supabase Client] Reading key: ${key}`, value ? 'found' : 'not found')
            }
            return value
          } catch (error) {
            console.warn(`[Supabase Client] Error reading localStorage key ${key}:`, error)
            return null
          }
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return
          try {
            window.localStorage.setItem(key, value)
            if (process.env.NODE_ENV === 'development' && key.includes('supabase')) {
              console.debug(`[Supabase Client] Storing key: ${key}`)
            }
          } catch (error) {
            console.warn(`[Supabase Client] Error storing localStorage key ${key}:`, error)
            // Try to clear some space by removing expired items
            try {
              const keys = Object.keys(window.localStorage)
              keys.forEach(k => {
                if (k.startsWith('supabase.auth.token') && k !== key) {
                  window.localStorage.removeItem(k)
                }
              })
              // Retry the set operation
              window.localStorage.setItem(key, value)
            } catch (retryError) {
              console.error(`[Supabase Client] Failed to store ${key} after cleanup:`, retryError)
            }
          }
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return
          try {
            window.localStorage.removeItem(key)
            if (process.env.NODE_ENV === 'development' && key.includes('supabase')) {
              console.debug(`[Supabase Client] Removing key: ${key}`)
            }
          } catch (error) {
            console.warn(`[Supabase Client] Error removing localStorage key ${key}:`, error)
          }
        },
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'adventure-log-browser',
      },
    },
  })

  return supabaseClient
}

/**
 * Get the current browser client instance
 * Always use this instead of creating new clients
 */
export function getSupabaseClient() {
  return createClient()
}

/**
 * Browser-safe client for components
 * This is the main export that should be used in React components
 */
export const supabase = createClient()

/**
 * Type definitions for better TypeScript support
 */
export type SupabaseClient = ReturnType<typeof createClient>
export type User = ReturnType<typeof createClient>['auth']['getUser'] extends Promise<{ data: { user: infer U } }> ? U : never
export type Session = ReturnType<typeof createClient>['auth']['getSession'] extends Promise<{ data: { session: infer S } }> ? S : never

/**
 * Auth helper functions
 */
export const auth = {
  /**
   * Sign in with Google OAuth
   */
  signInWithGoogle: async (options?: { redirectTo?: string }) => {
    const client = getSupabaseClient()
    return await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  },

  /**
   * Sign out user
   */
  signOut: async () => {
    const client = getSupabaseClient()
    return await client.auth.signOut()
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const client = getSupabaseClient()
    return await client.auth.getSession()
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const client = getSupabaseClient()
    return await client.auth.getUser()
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange: (callback: (event: any, session: Session | null) => void) => {
    const client = getSupabaseClient()
    return client.auth.onAuthStateChange(callback)
  },

  /**
   * Refresh the current session
   */
  refreshSession: async () => {
    const client = getSupabaseClient()
    return await client.auth.refreshSession()
  },
}

/**
 * Storage helpers with proper authentication context
 */
export const storage = {
  /**
   * Upload file to storage bucket
   */
  upload: async (bucket: string, path: string, file: File, options?: any) => {
    const client = getSupabaseClient()
    return await client.storage.from(bucket).upload(path, file, options)
  },

  /**
   * Download file from storage
   */
  download: async (bucket: string, path: string) => {
    const client = getSupabaseClient()
    return await client.storage.from(bucket).download(path)
  },

  /**
   * Get public URL for file
   */
  getPublicUrl: (bucket: string, path: string) => {
    const client = getSupabaseClient()
    return client.storage.from(bucket).getPublicUrl(path)
  },

  /**
   * Create signed URL for file
   */
  createSignedUrl: async (bucket: string, path: string, expiresIn: number = 3600) => {
    const client = getSupabaseClient()
    return await client.storage.from(bucket).createSignedUrl(path, expiresIn)
  },

  /**
   * Delete file from storage
   */
  remove: async (bucket: string, paths: string[]) => {
    const client = getSupabaseClient()
    return await client.storage.from(bucket).remove(paths)
  },
}

/**
 * Database helpers with Row Level Security
 */
export const db = {
  /**
   * Get albums for current user
   */
  getAlbums: async () => {
    const client = getSupabaseClient()
    return await client
      .from('albums')
      .select(`
        *,
        photos:album_photos(count)
      `)
      .order('created_at', { ascending: false })
  },

  /**
   * Get album by ID (with RLS)
   */
  getAlbum: async (id: string) => {
    const client = getSupabaseClient()
    return await client
      .from('albums')
      .select(`
        *,
        photos:album_photos(*)
      `)
      .eq('id', id)
      .single()
  },

  /**
   * Create new album
   */
  createAlbum: async (album: any) => {
    const client = getSupabaseClient()
    return await client
      .from('albums')
      .insert(album)
      .select()
      .single()
  },

  /**
   * Update album
   */
  updateAlbum: async (id: string, updates: any) => {
    const client = getSupabaseClient()
    return await client
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  },

  /**
   * Delete album
   */
  deleteAlbum: async (id: string) => {
    const client = getSupabaseClient()
    return await client
      .from('albums')
      .delete()
      .eq('id', id)
  },
}

/**
 * Error handling helpers
 */
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  if (error?.code === 'PGRST301') {
    return 'Authentication required. Please sign in to access this resource.'
  }
  
  if (error?.code === 'PGRST116') {
    return 'Resource not found or you do not have permission to access it.'
  }
  
  if (error?.message?.includes('JWT')) {
    return 'Your session has expired. Please sign in again.'
  }
  
  return error?.message || 'An unexpected error occurred. Please try again.'
}

/**
 * Development helpers
 */
export const dev = {
  /**
   * Get client info for debugging
   */
  getClientInfo: () => {
    const client = getSupabaseClient()
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasClient: !!client,
      timestamp: new Date().toISOString(),
    }
  },

  /**
   * Test authentication status
   */
  testAuth: async () => {
    try {
      const client = getSupabaseClient()
      const { data: session } = await client.auth.getSession()
      const { data: user } = await client.auth.getUser()
      
      return {
        hasSession: !!session?.session,
        hasUser: !!user?.user,
        userId: user?.user?.id,
        email: user?.user?.email,
        sessionExpiry: session?.session?.expires_at,
      }
    } catch (error) {
      return {
        error: handleSupabaseError(error)
      }
    }
  },
}

// Export the main client as default
export default supabase