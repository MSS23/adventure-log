import { act, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────
//
// AuthProvider reads identity from the Supabase session (`auth.getSession` +
// `auth.onAuthStateChange`) and loads the public.users row via the same
// client. Tests therefore mock `@/lib/supabase/client` with a stub exposing
// both surfaces:
//
//   1. `auth.getSession` / `auth.onAuthStateChange` / `auth.signOut` — drive
//      the authenticated user per test via the `sessionUser` option.
//   2. `.from().select().eq().maybeSingle()` — resolves to whatever the test
//      preloads.
//
// We also stub `@/lib/hooks/useSmartNavigation` because AuthProvider imports
// `resetNavigationState` for sign-out cleanup, and that module pulls in
// next/navigation internals jsdom can't satisfy.

jest.mock('@/lib/hooks/useSmartNavigation', () => ({
  __esModule: true,
  resetNavigationState: jest.fn(),
}))

jest.mock('@/lib/supabase/client')

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type SessionUserShape = {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
  created_at?: string
}

interface SupabaseStubOptions {
  /**
   * Sequence of results to return from `.maybeSingle()`. The fetcher de-queues
   * one per call so retry-loop tests can simulate "row appears on attempt N".
   * Falls back to the last entry when exhausted (mirrors a row that finally
   * exists and stays cached).
   */
  maybeSingleQueue?: Array<{ data: unknown; error: unknown }>
  /**
   * The Supabase session user `auth.getSession()` resolves with. `null`
   * simulates an unauthenticated visitor.
   */
  sessionUser?: SessionUserShape | null
}

function makeSupabaseStub({
  maybeSingleQueue = [{ data: null, error: null }],
  sessionUser = null,
}: SupabaseStubOptions = {}) {
  let cursor = 0
  const maybeSingle = jest.fn().mockImplementation(() => {
    const next = maybeSingleQueue[Math.min(cursor, maybeSingleQueue.length - 1)]
    cursor++
    return Promise.resolve(next)
  })

  const eq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ select })

  const auth = {
    getSession: jest.fn().mockResolvedValue({
      data: { session: sessionUser ? { user: sessionUser } : null },
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  }

  return { from, select, eq, maybeSingle, auth }
}

/**
 * Tiny consumer so we can assert on the values useAuth() exposes from the
 * provider. Avoids reaching into provider internals.
 */
function AuthProbe() {
  const { user, profile, profileLoading, profileError } = useAuth()
  return (
    <div>
      <div data-testid="user-id">{user?.id ?? 'null'}</div>
      <div data-testid="user-email">{user?.email ?? 'null'}</div>
      <div data-testid="profile-username">
        {profile?.username ?? 'null'}
      </div>
      <div data-testid="profile-loading">{String(profileLoading)}</div>
      <div data-testid="profile-error">{profileError ?? 'null'}</div>
    </div>
  )
}

// Note: the retry-loop test below uses Jest fake timers via
// `jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })` and
// `jest.runAllTimersAsync()`. We deliberately do NOT install a global
// setTimeout spy — earlier versions of this test did, but a blanket spy also
// shrinks waitFor's internal 1000ms timeout to 0 (waitFor uses setTimeout
// underneath), which races with the retry IIFE's continuation and makes
// waitFor reject before the provider's state updates ever commit.

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exposes null user and null profile when Supabase reports no session', async () => {
    const stub = makeSupabaseStub()
    ;(createClient as jest.Mock).mockReturnValue(stub)

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    // Provider should settle synchronously — no profile fetch when there's no user.
    await waitFor(() => {
      expect(screen.getByTestId('profile-loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user-id')).toHaveTextContent('null')
    expect(screen.getByTestId('user-email')).toHaveTextContent('null')
    expect(screen.getByTestId('profile-username')).toHaveTextContent('null')
    expect(screen.getByTestId('profile-error')).toHaveTextContent('null')
    expect(stub.from).not.toHaveBeenCalled()
  })

  it('hydrates the profile when authenticated and the row already exists', async () => {
    const stub = makeSupabaseStub({
      sessionUser: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      },
      maybeSingleQueue: [
        {
          data: { id: 'user-123', username: 'existing_user', email: 'test@example.com' },
          error: null,
        },
      ],
    })
    ;(createClient as jest.Mock).mockReturnValue(stub)

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-username')).toHaveTextContent('existing_user')
    })
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('profile-error')).toHaveTextContent('null')
    expect(stub.from).toHaveBeenCalledWith('users')
    expect(stub.eq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('exercises the retry loop when the profile row is missing initially', async () => {
    // Fake timers let us collapse the provider's exponential-backoff sleeps
    // (200ms → 14s) without also collapsing waitFor's internal timeout.
    // `doNotFake: ['queueMicrotask']` keeps Promise continuations real so
    // awaits inside the IIFE still flush between fake-timer ticks.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })
    try {
      // First two attempts return no row (signup-trigger race), third attempt
      // succeeds.
      const stub = makeSupabaseStub({
        sessionUser: {
          id: 'user-pending',
          email: 'pending@example.com',
        },
        maybeSingleQueue: [
          { data: null, error: null },
          { data: null, error: null },
          {
            data: { id: 'user-pending', username: 'user_pending' },
            error: null,
          },
        ],
      })
      ;(createClient as jest.Mock).mockReturnValue(stub)

      render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      )

      // Flush the microtask queue first so getSession's promise resolves and
      // the first profile fetch misses — no retry timer exists until then.
      await act(async () => {
        await Promise.resolve()
      })

      // Drive the entire retry schedule to completion: each runAllTimersAsync()
      // advances every pending fake timer and yields to the microtask queue
      // between ticks so the IIFE's awaits can resolve.
      await act(async () => {
        await jest.runAllTimersAsync()
      })

      expect(screen.getByTestId('profile-username')).toHaveTextContent('user_pending')
      expect(screen.getByTestId('profile-error')).toHaveTextContent('null')
      // 1 initial + 2 retries = 3 maybeSingle invocations.
      expect(stub.maybeSingle).toHaveBeenCalledTimes(3)
    } finally {
      jest.useRealTimers()
    }
  })
})
