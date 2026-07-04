'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { resetNavigationState } from '@/lib/hooks/useSmartNavigation'

// Minimal user shape consumers depend on. `id` is the Supabase auth UUID.
//
// SECURITY — only the server-controlled `app_metadata` is exposed. Supabase's
// `user_metadata` is client-writable (a user can set arbitrary values via
// supabase.auth.updateUser), so mirroring it here would turn any
// `if (user.user_metadata?.role === 'admin')` check into an authorization
// bypass. For trustworthy, server-set data use `app_metadata` (only writable
// with the service-role key); for untrusted preferences read user_metadata
// explicitly at the call site with a comment that it is attacker-controlled.
export interface AuthUser {
  id: string
  email: string | null
  app_metadata?: Record<string, unknown>
  created_at?: string
}

export type ProfileError = 'provisioning_timeout' | 'fetch_failed'

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  authLoading: boolean
  profileLoading: boolean
  profileError: ProfileError | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /**
   * Manually retry profile loading. Use this from a "Try again" button when
   * `profileError === 'provisioning_timeout'`.
   */
  retryProfileLoad: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Exponential-backoff schedule for the post-signup provisioning race. Sums to
// ~30s — plenty of time for the auth.users INSERT → create_profile_on_signup
// trigger → public.users row. After this the user sees a "we're setting up
// your account" UI rather than a hang.
const PROFILE_RETRY_DELAYS_MS = [200, 500, 1_000, 2_000, 4_000, 8_000, 14_000]

interface ProfileCache {
  data: Profile
  timestamp: number
}

function toAuthUser(supaUser: SupabaseUser | null): AuthUser | null {
  if (!supaUser) return null
  return {
    id: supaUser.id,
    email: supaUser.email ?? null,
    app_metadata: supaUser.app_metadata as Record<string, unknown> | undefined,
    created_at: supaUser.created_at,
  }
}

/**
 * Supabase-owned auth surface. Supabase manages the session; the app loads its
 * own profile row from public.users keyed by the auth user id (UUID).
 *
 * Provisioning rule:
 *   * On signup the `create_profile_on_signup` trigger inserts into public.users.
 *   * If the trigger hasn't committed yet (first-login race) fetchProfile waits
 *     and retries on an exponential backoff up to ~30s. We don't insert from the
 *     client because RLS only allows the user to write their own row and the
 *     trigger owns username derivation/collision handling.
 *   * On retry timeout the context exposes `profileError = 'provisioning_timeout'`
 *     so the UI can show a recovery affordance.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  const [supaUser, setSupaUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<ProfileError | null>(null)
  // Bumped to force the load effect to re-run on demand (manual retry).
  const [retryNonce, setRetryNonce] = useState(0)

  const profileCache = useRef<Map<string, ProfileCache>>(new Map())
  const inFlightFetches = useRef<Map<string, Promise<Profile | null>>>(new Map())

  const user: AuthUser | null = useMemo(() => toAuthUser(supaUser), [supaUser])

  // Establish the session and subscribe to auth changes.
  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setSupaUser(session?.user ?? null)
        setAuthLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setSupaUser(null)
        setAuthLoading(false)
        log.error(
          'Failed to read auth session',
          { component: 'AuthProvider', action: 'getSession' },
          err instanceof Error ? err : new Error(String(err)),
        )
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null
      // TOKEN_REFRESHED/SIGNED_IN deliver a NEW user object (~hourly and on
      // tab focus) even when nothing changed. Keep the previous reference so
      // hooks keyed on the user object don't refetch and flash loading.
      // Sign-out (next === null) always propagates.
      setSupaUser((prev) =>
        prev && next && prev.id === next.id && prev.email === next.email && prev.updated_at === next.updated_at
          ? prev
          : next,
      )
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  /**
   * One-shot profile fetch. Returns:
   *   - Profile on success
   *   - null when the row doesn't exist yet (caller should retry)
   *   - throws on non-recoverable database error (caller surfaces as fetch_failed)
   */
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
        // Own-row fetch goes through the get_my_profile() SECURITY DEFINER
        // RPC (migration 76): the users PII lockdown revokes column-level
        // SELECT on sensitive columns, so a direct select('*') is permission-
        // denied once applied — but the user must still get their own FULL
        // row. Fall back to the direct select for environments where the
        // migration hasn't been applied yet (the RPC doesn't exist there).
        let data: Profile | null = null

        const rpc = await supabase.rpc('get_my_profile')
        if (!rpc.error) {
          const own = ((rpc.data ?? []) as Profile[])[0] ?? null
          // The RPC returns auth.uid()'s row. Guard against a mid-flight
          // session change so a stale userId cache key never stores another
          // account's profile.
          data = own && own.id === userId ? own : null
        } else {
          const { data: direct, error } = await supabase
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
            throw error
          }
          data = (direct as Profile | null) ?? null
        }

        if (!data) {
          // Row doesn't exist yet — the create_profile_on_signup trigger is
          // still processing. Caller's retry loop handles this.
          return null
        }

        const profileData = data
        profileCache.current.set(userId, {
          data: profileData,
          timestamp: Date.now(),
        })
        return profileData
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
    setProfileError(null)
    try {
      const next = await fetchProfile(user.id, false)
      setProfile(next)
      if (!next) {
        setProfileError('provisioning_timeout')
      }
    } catch {
      setProfileError('fetch_failed')
    } finally {
      setProfileLoading(false)
    }
  }, [user, fetchProfile])

  const retryProfileLoad = useCallback(async () => {
    setRetryNonce((n) => n + 1)
  }, [])

  // Load profile whenever the auth user changes, with an exponential-backoff
  // retry loop to bridge the post-signup provisioning race.
  useEffect(() => {
    let cancelled = false
    const timeouts = new Set<ReturnType<typeof setTimeout>>()

    if (authLoading) return

    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
      profileCache.current.clear()
      return
    }

    setProfileLoading(true)
    setProfileError(null)

    const cancellableSleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms)
        timeouts.add(timer)
      })

    ;(async () => {
      try {
        let next = await fetchProfile(user.id)
        if (cancelled) return

        for (let i = 0; i < PROFILE_RETRY_DELAYS_MS.length && !next; i++) {
          if (cancelled) return
          await cancellableSleep(PROFILE_RETRY_DELAYS_MS[i])
          if (cancelled) return
          next = await fetchProfile(user.id, false)
          if (cancelled) return
        }

        if (cancelled) return
        if (next) {
          setProfile(next)
          setProfileError(null)
        } else {
          setProfile(null)
          setProfileError('provisioning_timeout')
          log.error('Profile provisioning timed out', {
            component: 'AuthProvider',
            action: 'fetchProfile',
            userId: user.id,
            totalWaitMs: PROFILE_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0),
          })
        }
      } catch (err) {
        if (cancelled) return
        setProfile(null)
        setProfileError('fetch_failed')
        log.error(
          'Profile fetch threw',
          { component: 'AuthProvider', action: 'fetchProfile', userId: user.id },
          err instanceof Error ? err : new Error(String(err)),
        )
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()

    return () => {
      cancelled = true
      for (const t of timeouts) clearTimeout(t)
      timeouts.clear()
    }
  }, [authLoading, user, fetchProfile, retryNonce])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
      profileCache.current.clear()
      inFlightFetches.current.clear()

      resetNavigationState()

      log.info('User signed out', { component: 'AuthProvider', action: 'signOut' })

      // Hard-navigate to login so every logout entry point redirects
      // consistently and all in-memory auth/profile state is fully torn down.
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    } catch (error) {
      log.error(
        'Sign out failed',
        { component: 'AuthProvider', action: 'signOut' },
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }, [supabase])

  const value: AuthContextType = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      profileError,
      signOut,
      refreshProfile,
      retryProfileLoad,
    }),
    [user, profile, authLoading, profileLoading, profileError, signOut, refreshProfile, retryProfileLoad],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
