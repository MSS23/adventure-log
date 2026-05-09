'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { resetNavigationState } from '@/lib/hooks/useSmartNavigation'

// Minimal user shape consumers depend on. Mirrors the fields the codebase
// actually reads off the previous Supabase `User`. id is now the Clerk
// subject (e.g. "user_2x7…").
export interface AuthUser {
  id: string
  email: string | null
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
  created_at?: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  authLoading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface ProfileCache {
  data: Profile
  timestamp: number
}

/**
 * Bridges Clerk's identity into the existing useAuth() surface. Clerk owns the
 * session; the app still loads its own profile row from public.users keyed by
 * the Clerk user id.
 *
 * Provisioning rule:
 *   * On `user.created` Clerk fires a webhook that inserts into public.users.
 *   * If the webhook hasn't fired yet (first login race) fetchProfile waits
 *     and retries; we don't insert from the client because RLS only allows
 *     the user themselves to write their own row, and on first sign-in we
 *     don't yet have a row to satisfy that policy.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()

  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const profileCache = useRef<Map<string, ProfileCache>>(new Map())
  const inFlightFetches = useRef<Map<string, Promise<Profile | null>>>(new Map())

  const authLoading = !clerkLoaded

  const user: AuthUser | null = useMemo(() => {
    if (!clerkUser) return null
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      user_metadata: clerkUser.unsafeMetadata as Record<string, unknown> | undefined,
      app_metadata: clerkUser.publicMetadata as Record<string, unknown> | undefined,
      created_at: clerkUser.createdAt?.toISOString(),
    }
  }, [clerkUser])

  const fetchProfile = useCallback(
    async (userId: string, useCache = true): Promise<Profile | null> => {
      if (useCache) {
        const cached = profileCache.current.get(userId)
        if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
          return cached.data
        }
      }

      const existing = inFlightFetches.current.get(userId)
      if (existing) return existing

      const promise = (async (): Promise<Profile | null> => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle()

          if (error) {
            log.error(
              'Profile fetch failed',
              {
                component: 'AuthProvider',
                action: 'fetchProfile',
                userId,
                errorCode: error.code,
                errorMessage: error.message,
              },
              error as Error,
            )
            return null
          }

          if (!data) {
            // Row doesn't exist yet — Clerk webhook is still processing the
            // user.created event. Caller will retry on next render.
            log.info('Profile not yet provisioned, waiting for webhook', {
              component: 'AuthProvider',
              action: 'fetchProfile',
              userId,
            })
            return null
          }

          const profileData = data as Profile
          profileCache.current.set(userId, {
            data: profileData,
            timestamp: Date.now(),
          })
          return profileData
        } catch (error) {
          log.error(
            'Profile fetch threw',
            { component: 'AuthProvider', action: 'fetchProfile', userId },
            error instanceof Error ? error : new Error(String(error)),
          )
          return null
        }
      })()

      inFlightFetches.current.set(userId, promise)
      try {
        return await promise
      } finally {
        inFlightFetches.current.delete(userId)
      }
    },
    [supabase],
  )

  const refreshProfile = useCallback(async () => {
    if (!user) return
    setProfileLoading(true)
    try {
      const next = await fetchProfile(user.id, false)
      setProfile(next)
    } finally {
      setProfileLoading(false)
    }
  }, [user, fetchProfile])

  // Load profile whenever Clerk's user changes.
  useEffect(() => {
    let cancelled = false

    if (!clerkLoaded) return

    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      profileCache.current.clear()
      return
    }

    setProfileLoading(true)
    fetchProfile(user.id)
      .then((next) => {
        if (cancelled) return
        setProfile(next)
      })
      .finally(() => {
        if (cancelled) return
        setProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clerkLoaded, user, fetchProfile])

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut()
      setProfile(null)
      setProfileLoading(false)
      profileCache.current.clear()
      inFlightFetches.current.clear()

      resetNavigationState()
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }

      log.info('User signed out', { component: 'AuthProvider', action: 'signOut' })
    } catch (error) {
      log.error(
        'Sign out failed',
        { component: 'AuthProvider', action: 'signOut' },
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }, [clerkSignOut])

  const value: AuthContextType = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      signOut,
      refreshProfile,
    }),
    [user, profile, authLoading, profileLoading, signOut, refreshProfile],
  )

  // Touch isSignedIn so the linter knows we're aware of it; the boolean is
  // implicit in `user`, but exposing it would invite consumers to drift.
  void isSignedIn

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
