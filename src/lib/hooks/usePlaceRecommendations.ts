'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import type { PlaceRecommendation, PlaceType } from '@/types/database'

/**
 * usePlaceRecommendations — React Query hooks wrapping the Place Recommendations
 * API (`/api/place-recommendations*`). The list endpoint works for anonymous
 * users, so most hooks do NOT gate on auth; only the bump optimistic update
 * needs to know the viewer.
 *
 * API contract (built by the backend agent in parallel):
 *   GET  /api/place-recommendations?city=&country_code=&type=&q=&sort=top|new&limit=
 *        -> { recommendations: PlaceRecommendation[] }
 *   POST /api/place-recommendations  (body below) -> { recommendation } (201)
 *   POST /api/place-recommendations/[id]/bump -> { bumped, bump_count }
 *   GET  /api/place-recommendations/cities -> { cities: [{ city, country_code, count }] }
 */

export const RECOMMENDATIONS_KEY = 'place-recommendations'
export const RECOMMENDATION_CITIES_KEY = 'place-recommendation-cities'

export type RecommendationSort = 'top' | 'new'

export interface RecommendationFilters {
  city?: string
  countryCode?: string
  type?: PlaceType
  q?: string
  sort?: RecommendationSort
  limit?: number
}

export interface RecommendationCity {
  city: string
  country_code: string | null
  count: number
}

export interface CreateRecommendationInput {
  title: string
  place_type: PlaceType
  tip?: string
  city: string
  country_code?: string
  location_name?: string
  latitude: number
  longitude: number
}

/**
 * Stable, serialisable query-key fragment for a given filter set. Keeping the
 * key normalised (undefined → omitted) means two equivalent filter objects hit
 * the same cache entry.
 */
function filtersKey(filters: RecommendationFilters) {
  return {
    city: filters.city || null,
    countryCode: filters.countryCode || null,
    type: filters.type || null,
    q: filters.q?.trim() || null,
    sort: filters.sort || 'top',
    limit: filters.limit || null,
  }
}

function buildListQuery(filters: RecommendationFilters): string {
  const params = new URLSearchParams()
  if (filters.city) params.set('city', filters.city)
  if (filters.countryCode) params.set('country_code', filters.countryCode)
  if (filters.type) params.set('type', filters.type)
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  params.set('sort', filters.sort || 'top')
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Fetch the ranked list of recommendations for the given filters. Works for
 * anonymous viewers (each item's `has_bumped` is false when logged out).
 */
export function useRecommendations(filters: RecommendationFilters = {}) {
  return useQuery<PlaceRecommendation[]>({
    queryKey: [RECOMMENDATIONS_KEY, filtersKey(filters)],
    queryFn: async () => {
      const res = await apiFetch(`/api/place-recommendations${buildListQuery(filters)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data.error || 'Failed to load recommendations'
        log.error('Failed to fetch recommendations', {
          component: 'usePlaceRecommendations',
          action: 'list',
          status: res.status,
        }, new Error(message))
        throw new Error(message)
      }
      const data = await res.json()
      return (data.recommendations || []) as PlaceRecommendation[]
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch the list of cities that currently have recommendations, with counts,
 * to drive the browse-by-destination affordance.
 */
export function useRecommendationCities() {
  return useQuery<RecommendationCity[]>({
    queryKey: [RECOMMENDATION_CITIES_KEY],
    queryFn: async () => {
      const res = await apiFetch('/api/place-recommendations/cities')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data.error || 'Failed to load destinations'
        log.error('Failed to fetch recommendation cities', {
          component: 'usePlaceRecommendations',
          action: 'cities',
          status: res.status,
        }, new Error(message))
        throw new Error(message)
      }
      const data = await res.json()
      return (data.cities || []) as RecommendationCity[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Create a new recommendation. Invalidates the list + cities caches on success
 * so the new tip surfaces immediately.
 */
export function useCreateRecommendation() {
  const queryClient = useQueryClient()

  return useMutation<PlaceRecommendation, Error, CreateRecommendationInput>({
    mutationFn: async (input) => {
      const res = await apiFetch('/api/place-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add recommendation')
      }
      const data = await res.json()
      return data.recommendation as PlaceRecommendation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATION_CITIES_KEY] })
    },
    onError: (error) => {
      log.error('Error creating recommendation', {
        component: 'usePlaceRecommendations',
        action: 'create',
      }, error)
    },
  })
}

/**
 * Toggle the current user's bump on a recommendation with an OPTIMISTIC update:
 * every cached list that contains the rec flips `has_bumped` and nudges
 * `bump_count` immediately, then rolls back if the server rejects. This is the
 * core interaction, so it must feel instant.
 */
export function useToggleBump() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<
    { bumped: boolean; bump_count: number },
    Error,
    { id: string },
    { snapshots: Array<[readonly unknown[], PlaceRecommendation[] | undefined]> }
  >({
    mutationFn: async ({ id }) => {
      const res = await apiFetch(`/api/place-recommendations/${id}/bump`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to bump recommendation')
      }
      return res.json() as Promise<{ bumped: boolean; bump_count: number }>
    },
    onMutate: async ({ id }) => {
      // Cancel in-flight list fetches so they don't clobber our optimistic state.
      await queryClient.cancelQueries({ queryKey: [RECOMMENDATIONS_KEY] })

      const queries = queryClient.getQueriesData<PlaceRecommendation[]>({
        queryKey: [RECOMMENDATIONS_KEY],
      })
      const snapshots = queries.map(
        ([key, value]) => [key, value] as [readonly unknown[], PlaceRecommendation[] | undefined]
      )

      for (const [key, value] of queries) {
        if (!value) continue
        queryClient.setQueryData<PlaceRecommendation[]>(
          key,
          value.map((rec) => {
            if (rec.id !== id) return rec
            const wasBumped = !!rec.has_bumped
            return {
              ...rec,
              has_bumped: !wasBumped,
              bump_count: Math.max(0, rec.bump_count + (wasBumped ? -1 : 1)),
            }
          })
        )
      }

      return { snapshots }
    },
    onError: (error, _vars, context) => {
      // Roll every touched cache back to its pre-mutation snapshot.
      context?.snapshots.forEach(([key, value]) => {
        queryClient.setQueryData(key, value)
      })
      log.error('Error toggling bump', {
        component: 'usePlaceRecommendations',
        action: 'bump',
        userId: user?.id,
      }, error)
    },
    onSuccess: (result, { id }) => {
      // Reconcile with the server's authoritative count (covers concurrent
      // bumps from other users between our read and write).
      const queries = queryClient.getQueriesData<PlaceRecommendation[]>({
        queryKey: [RECOMMENDATIONS_KEY],
      })
      for (const [key, value] of queries) {
        if (!value) continue
        queryClient.setQueryData<PlaceRecommendation[]>(
          key,
          value.map((rec) =>
            rec.id === id
              ? { ...rec, has_bumped: result.bumped, bump_count: result.bump_count }
              : rec
          )
        )
      }
    },
  })
}
