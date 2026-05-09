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
//
// SECURITY — `user_metadata` was REMOVED in the Round 4 hardening pass.
// Supabase's `User.user_metadata` was server-validated, but Clerk's analogue
// (`unsafeMetadata`) is, by design, **client-writable**: any user can set
// `unsafeMetadata.role = 'admin'` from their own browser via
// `clerkUser.update({ unsafeMetadata: ... })`. Mirroring it here as
// `user_metadata` made every `if (user.user_metadata?.role === 'admin')`
// check downstream into an authorization bypass.
//
// If you need user-scoped data in a component:
//   * Trustworthy, server-set data → `app_metadata` (mirrors Clerk
//     `publicMetadata`, only writable via the Clerk Backend API or webhooks).
//     For authorization decisions on the server, prefer reading
//     `publicMetadata` fresh from `clerkClient.users.getUser(userId)` inside
//     a server action / route handler so revocations apply immediately.
//   * Untrusted, user-set preferences (signup-source, UTM tags, theme) →
//     read `useUser().user.unsafeMetadata` directly with a comment that the
//     value is attacker-controlled and must not gate sensitive behavior.
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

// Exponential-backoff schedule for the post-signup webhook race. Sums to
// ~30s — plenty of time for Clerk → our webhook → Supabase insert. After this
// the user sees a "we're setting up your account" UI rather than a hang.
const PROFILE_RETRY_DELAYS_MS = [200, 500, 1_000, 2_000, 4_000, 8_000, 14_000]

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
 *     and retries on an exponential backoff up to ~30s. We don't insert from
 *     the client because RLS only allows the user to write their own row, and
 *     duplicating the webhook's username-derivation logic would diverge over
 *     time (the webhook handles collisions with random suffixes, derives from
 *     email/clerk-id fallbacks, etc).
 *   * On retry timeout the context exposes `profileError = 'provisioning_timeout'`
 *     so the UI can show a recovery affordance.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()

  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<ProfileError | null>(null)
  // Bumped to force the load effect to re-run on demand (manual retry).
  const [retryNonce, setRetryNonce] = useState(0)

  const profileCache = useRef<Map<string, ProfileCache>>(new Map())
  const inFlightFetches = useRef<Map<string, Promise<Profile | null>>>(new Map())

  const authLoading = !clerkLoaded

  const user: AuthUser | null = useMemo(() => {
    if (!clerkUser) return null
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      // Only Clerk's server-controlled `publicMetadata` is exposed. See the
      // SECURITY note on `AuthUser` for why `unsafeMetadata` is intentionally
      // NOT mirrored here.
      app_metadata: clerkUser.publicMetadata as Record<string, unknown> | undefined,
      created_at: clerkUser.createdAt?.toISOString(),
    }
  }, [clerkUser])

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
          throw error
        }

        if (!data) {
          // Row doesn't exist yet — Clerk webhook is still processing the
          // user.created event. Caller's retry loop handles this.
          return null
        }

        const profileData = data as Profile
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
        // Even an explicit refresh shouldn't lie about absence — bubble up so
        // the UI can decide whether to start the retry loop or surface an error.
        setProfileError('provisioning_timeout')
      }
    } catch {
      setProfileError('fetch_failed')
    } finally {
      setProfileLoading(false)
    }
  }, [user, fetchProfile])

  const retryProfileLoad = useCallback(async () => {
    // Bumping the nonce re-runs the effect below, which is the canonical
    // path that owns the retry/backoff state machine.
    setRetryNonce((n) => n + 1)
  }, [])

  // Load profile whenever Clerk's user changes, with an exponential-backoff
  // retry loop to bridge the post-signup webhook race.
  useEffect(() => {
    let cancelled = false

    if (!clerkLoaded) return

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
        // Make the sleep abortable: the cleanup below replaces the closure's
        // `cancelled` reference, but `clearTimeout` is the actual abort. We
        // attach the timer id to a ref-like local so cleanup can clear it.
        timeouts.add(timer)
      })

    const timeouts = new Set<ReturnType<typeof setTimeout>>()

    ;(async () => {
      try {
        // Initial attempt (cache-eligible — fast path for warm sessions).
        let next = await fetchProfile(user.id)
        if (cancelled) return

        // Retry with backoff if the row isn't there yet.
        for (let i = 0; i < PROFILE_RETRY_DELAYS_MS.length && !next; i++) {
          if (cancelled) return
          await cancellableSleep(PROFILE_RETRY_DELAYS_MS[i])
          if (cancelled) return
          // Bypass cache so we hit the database on every retry.
          next = await fetchProfile(user.id, false)
          if (cancelled) return
        }

        if (cancelled) return
        if (next) {
          setProfile(next)
          setProfileError(null)
        } else {
          // Webhook hasn't landed after ~30s. Surface as a timeout so the UI
          // can offer a manual retry (call retryProfileLoad) or guide the
          // user to support.
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
      // Cancel any pending sleeps so we don't leak timers across re-renders or
      // unmounts.
      for (const t of timeouts) clearTimeout(t)
      timeouts.clear()
    }
  }, [clerkLoaded, user, fetchProfile, retryNonce])

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut()
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
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
      profileError,
      signOut,
      refreshProfile,
      retryProfileLoad,
    }),
    [user, profile, authLoading, profileLoading, profileError, signOut, refreshProfile, retryProfileLoad],
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
