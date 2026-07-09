import type { SupabaseClient } from '@supabase/supabase-js'
import { runQueryWithRetry } from '@/lib/utils/query-retry'

/**
 * The single source of truth for a user's located-albums dataset on the globe.
 *
 * Both globe consumers used to download the same albums+photos independently
 * and in parallel on every /globe visit:
 *   - `useGlobePageData.albumsQuery` (header, stats, filmstrip)
 *   - `useTravelTimeline` (pins, arcs, per-year buckets — via useGlobeState)
 *
 * This module runs ONE superset query and shares the in-flight promise across
 * consumers and across mounts. Entries expire on a TTL: other users' datasets
 * live for 5 minutes (matching the app-wide React Query staleTime), while the
 * viewer's OWN dataset expires after seconds — long enough to dedupe the two
 * mount-time consumers, short enough that a just-created album pins on the
 * next globe visit.
 */
export interface GlobeAlbumRow {
  id: string
  title: string | null
  location_name: string | null
  country_code: string | null
  latitude: number | string
  longitude: number | string
  created_at: string
  date_start: string | null
  start_date: string | null
  description: string | null
  cover_photo_url: string | null
  favorite_photo_urls: string[] | null
  visibility: string | null
  status: string | null
  connected_from_album_id: string | null
  photos: Array<{ id: string; file_path: string }> | null
}

export type GlobeDatasetResult = { data: GlobeAlbumRow[] | null; error: unknown }

const OWN_TTL_MS = 15_000
const CROSS_USER_TTL_MS = 5 * 60_000

const cache = new Map<string, { at: number; ttl: number; promise: Promise<GlobeDatasetResult> }>()

export function fetchGlobeBaseDataset(
  supabase: SupabaseClient,
  targetUserId: string,
  { isOwnProfile }: { isOwnProfile: boolean }
): Promise<GlobeDatasetResult> {
  const cached = cache.get(targetUserId)
  if (cached && Date.now() - cached.at < cached.ttl) return cached.promise

  const promise = runQueryWithRetry(async () =>
    supabase
      .from('albums')
      .select(
        `
        id,
        title,
        location_name,
        country_code,
        latitude,
        longitude,
        created_at,
        date_start,
        start_date,
        description,
        cover_photo_url,
        favorite_photo_urls,
        visibility,
        status,
        connected_from_album_id,
        photos(id, file_path)
      `
      )
      .eq('user_id', targetUserId)
      .neq('status', 'draft')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('date_start', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
  ) as Promise<GlobeDatasetResult>

  cache.set(targetUserId, {
    at: Date.now(),
    ttl: isOwnProfile ? OWN_TTL_MS : CROSS_USER_TTL_MS,
    promise,
  })

  // A failure (resolved error or rejection) must never be replayed for the
  // full TTL — drop it so the callers' retry paths hit the network again.
  promise.then(
    (result) => {
      if (result.error) invalidateIfCurrent(targetUserId, promise)
    },
    () => invalidateIfCurrent(targetUserId, promise)
  )

  return promise
}

function invalidateIfCurrent(userId: string, promise: Promise<GlobeDatasetResult>) {
  if (cache.get(userId)?.promise === promise) cache.delete(userId)
}

/** Force the next fetch for this user to hit the network (explicit refresh). */
export function invalidateGlobeBaseDataset(userId: string) {
  cache.delete(userId)
}

/**
 * Fire-and-forget warm-up (friend-switcher hover/press). Errors are swallowed
 * — the cache self-invalidates on failure, so the real navigation refetches.
 */
export function prefetchGlobeBaseDataset(supabase: SupabaseClient, targetUserId: string) {
  fetchGlobeBaseDataset(supabase, targetUserId, { isOwnProfile: false }).catch(() => {})
}
