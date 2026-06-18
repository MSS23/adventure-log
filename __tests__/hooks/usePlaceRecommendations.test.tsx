/**
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlaceRecommendation } from '@/types/database'

// --- Boundary mocks (mirror the project's "mock at the module boundary" style) ---

// apiFetch is the single network boundary for these hooks.
const mockApiFetch = jest.fn()
jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Auth — useToggleBump reads user.id for logging only.
const mockUser: { id: string } | null = { id: 'viewer-1' }
jest.mock('@/components/auth/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: mockUser })),
}))

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import {
  useRecommendations,
  useToggleBump,
  RECOMMENDATIONS_KEY,
} from '@/lib/hooks/usePlaceRecommendations'

// Helper: a JSON Response-like object good enough for the hooks under test.
function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  }
}

function makeRec(overrides: Partial<PlaceRecommendation> = {}): PlaceRecommendation {
  return {
    id: 'rec-1',
    created_by: 'author-1',
    title: 'Best Ramen',
    place_type: 'eat',
    tip: null,
    city: 'Tokyo',
    country_code: 'JP',
    location_name: null,
    latitude: 35.6,
    longitude: 139.6,
    bump_count: 5,
    has_bumped: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// Fresh QueryClient per test (no retries so errors surface immediately).
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, queryClient }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useRecommendations', () => {
  it('requests the bare list endpoint (with default sort) when no filters', async () => {
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ recommendations: [] }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useRecommendations(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/place-recommendations?sort=top'
    )
  })

  it('builds the query string from all filters in the documented param shape', async () => {
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ recommendations: [] }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(
      () =>
        useRecommendations({
          city: 'Tokyo',
          countryCode: 'JP',
          type: 'eat',
          q: '  ramen  ',
          sort: 'new',
          limit: 20,
        }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calledWith = mockApiFetch.mock.calls[0][0] as string
    expect(calledWith.startsWith('/api/place-recommendations?')).toBe(true)
    const qs = new URLSearchParams(calledWith.split('?')[1])
    expect(qs.get('city')).toBe('Tokyo')
    expect(qs.get('country_code')).toBe('JP')
    expect(qs.get('type')).toBe('eat')
    expect(qs.get('q')).toBe('ramen') // trimmed
    expect(qs.get('sort')).toBe('new')
    expect(qs.get('limit')).toBe('20')
  })

  it('omits empty/whitespace q and unset filters from the query string', async () => {
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ recommendations: [] }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(
      () => useRecommendations({ q: '   ' }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calledWith = mockApiFetch.mock.calls[0][0] as string
    const qs = new URLSearchParams(calledWith.split('?')[1])
    expect(qs.has('q')).toBe(false)
    expect(qs.has('city')).toBe(false)
    expect(qs.get('sort')).toBe('top') // default always present
  })

  it('returns the recommendations array from the response envelope', async () => {
    const recs = [makeRec(), makeRec({ id: 'rec-2', title: 'Sushi' })]
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ recommendations: recs }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useRecommendations(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].title).toBe('Best Ramen')
  })
})

describe('useToggleBump (optimistic update)', () => {
  // Seed a cached list under the same key the hooks use, then assert the cache
  // mutates optimistically on mutate and reconciles/rolls back appropriately.
  function seedList(
    queryClient: QueryClient,
    recs: PlaceRecommendation[],
    filtersKeyFragment: Record<string, unknown> = {
      city: null,
      countryCode: null,
      type: null,
      q: null,
      sort: 'top',
      limit: null,
    }
  ) {
    queryClient.setQueryData(
      [RECOMMENDATIONS_KEY, filtersKeyFragment],
      recs
    )
    return [RECOMMENDATIONS_KEY, filtersKeyFragment] as const
  }

  it('optimistically flips has_bumped and increments bump_count immediately', async () => {
    const { wrapper, queryClient } = createWrapper()
    const key = seedList(queryClient, [makeRec({ has_bumped: false, bump_count: 5 })])

    // Make the network hang so we observe the *optimistic* (pre-settle) state.
    let resolveFetch: (v: unknown) => void = () => {}
    mockApiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    const { result } = renderHook(() => useToggleBump(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'rec-1' })
    })

    // Optimistic state applied synchronously in onMutate.
    await waitFor(() => {
      const cached = queryClient.getQueryData<PlaceRecommendation[]>(key)
      expect(cached?.[0].has_bumped).toBe(true)
      expect(cached?.[0].bump_count).toBe(6)
    })

    // Settle the request so React Query can clean up the mutation.
    await act(async () => {
      resolveFetch(jsonResponse({ bumped: true, bump_count: 6 }))
    })
  })

  it('optimistically un-bumps and decrements when already bumped', async () => {
    const { wrapper, queryClient } = createWrapper()
    const key = seedList(queryClient, [makeRec({ has_bumped: true, bump_count: 5 })])

    let resolveFetch: (v: unknown) => void = () => {}
    mockApiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    const { result } = renderHook(() => useToggleBump(), { wrapper })
    act(() => {
      result.current.mutate({ id: 'rec-1' })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<PlaceRecommendation[]>(key)
      expect(cached?.[0].has_bumped).toBe(false)
      expect(cached?.[0].bump_count).toBe(4)
    })

    await act(async () => {
      resolveFetch(jsonResponse({ bumped: false, bump_count: 4 }))
    })
  })

  it('rolls back to the pre-mutation snapshot when the server rejects', async () => {
    const { wrapper, queryClient } = createWrapper()
    const key = seedList(queryClient, [makeRec({ has_bumped: false, bump_count: 5 })])

    mockApiFetch.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, false, 500))

    const { result } = renderHook(() => useToggleBump(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 'rec-1' })
      } catch {
        // expected
      }
    })

    const cached = queryClient.getQueryData<PlaceRecommendation[]>(key)
    expect(cached?.[0].has_bumped).toBe(false)
    expect(cached?.[0].bump_count).toBe(5)
  })

  it('reconciles to the server-authoritative bump_count on success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const key = seedList(queryClient, [makeRec({ has_bumped: false, bump_count: 5 })])

    // Server reports 9 (e.g. concurrent bumps), not our optimistic 6.
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ bumped: true, bump_count: 9 }))

    const { result } = renderHook(() => useToggleBump(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'rec-1' })
    })

    const cached = queryClient.getQueryData<PlaceRecommendation[]>(key)
    expect(cached?.[0].has_bumped).toBe(true)
    expect(cached?.[0].bump_count).toBe(9)
  })

  it('only touches the targeted recommendation, leaving siblings unchanged', async () => {
    const { wrapper, queryClient } = createWrapper()
    const key = seedList(queryClient, [
      makeRec({ id: 'rec-1', has_bumped: false, bump_count: 5 }),
      makeRec({ id: 'rec-2', has_bumped: false, bump_count: 3 }),
    ])

    mockApiFetch.mockResolvedValueOnce(jsonResponse({ bumped: true, bump_count: 6 }))

    const { result } = renderHook(() => useToggleBump(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'rec-1' })
    })

    const cached = queryClient.getQueryData<PlaceRecommendation[]>(key)
    const sibling = cached?.find((r) => r.id === 'rec-2')
    expect(sibling?.has_bumped).toBe(false)
    expect(sibling?.bump_count).toBe(3)
  })
})
