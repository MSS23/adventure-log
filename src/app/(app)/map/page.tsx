'use client'

/**
 * /map — one 2D map of your travel world:
 *   · Friends — album locations from people you follow (public/friends posts)
 *   · Trips   — every stop pinned in your trip plans
 *   · Wishlist — bucket-list destinations
 *   (Wishlist includes places saved from TikTok / Google Maps links —
 *   they're the same table since migration 67.)
 * plus a "locate me" button that works on web and in the native app.
 *
 * Static route on purpose: it ships in the Capacitor bundle as-is. All API
 * data goes through apiFetch (bearer-auth on native); friends' albums are a
 * direct Supabase query (RLS-scoped), same pattern as the feed.
 */

import { useMemo, useState } from 'react'
import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { LocateFixed, Loader2, AlertTriangle, Globe as GlobeIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { getCurrentLocation } from '@/lib/capacitor/geolocation'
import { cn } from '@/lib/utils'
import {
  LAYER_META,
  type ExploreMapPin,
  type MapLayerKind,
  type FlyTarget,
} from '@/components/map/map-layers'

const ExploreMap = nextDynamic(() => import('@/components/map/ExploreMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl border border-border bg-muted flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

// ── Layer data types (minimal shapes of the API/table responses) ──────────

interface FriendAlbumRow {
  id: string
  title: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  user:
    | { username: string | null; display_name: string | null }
    | { username: string | null; display_name: string | null }[]
    | null
}

interface TripListEntry {
  id: string
  title: string
  pin_count?: number
}

interface TripPinRow {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface WishlistItemRow {
  id: string
  location_name: string
  latitude: number | null
  longitude: number | null
  priority: 'low' | 'medium' | 'high' | null
  completed_at: string | null
  // Link-import fields (migration 67 — merged from saved_places)
  source_platform?: string | null
  source_url?: string | null
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  google_maps: 'Google Maps',
  instagram: 'Instagram',
  manual: 'manual entry',
  other: 'a link',
}

function displayNameOf(user: FriendAlbumRow['user']): string {
  const u = Array.isArray(user) ? user[0] : user
  return u?.display_name || u?.username || 'A friend'
}

const hasCoords = (p: { latitude: number | null; longitude: number | null }) =>
  typeof p.latitude === 'number' && typeof p.longitude === 'number'

export default function MapPage() {
  const { user } = useAuth()
  const userId = user?.id
  const supabase = useMemo(() => createClient(), [])

  const [enabled, setEnabled] = useState<Record<MapLayerKind, boolean>>({
    friends: true,
    trips: true,
    wishlist: true,
  })
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null)
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null)
  const [locating, setLocating] = useState(false)

  // ── Friends: albums (with coordinates) from people you follow ───────────
  const friendsQuery = useQuery<ExploreMapPin[]>({
    queryKey: ['map-friends', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId!)
        .eq('status', 'accepted')
      if (followsError) throw followsError

      const followedIds = (follows || []).map((f) => f.following_id)
      if (followedIds.length === 0) return []

      const { data, error } = await supabase
        .from('albums')
        .select(
          'id, title, location_name, latitude, longitude, user:users!albums_user_id_fkey(username, display_name)'
        )
        .in('user_id', followedIds)
        // Never surface a followed user's PRIVATE albums (same rule as feed).
        .in('visibility', ['public', 'friends'])
        // Legacy albums can have NULL status — keep them, drop only drafts.
        .or('status.is.null,status.neq.draft')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(500)
      if (error) throw error

      return ((data || []) as FriendAlbumRow[]).filter(hasCoords).map((a) => ({
        id: a.id,
        kind: 'friends' as const,
        latitude: a.latitude!,
        longitude: a.longitude!,
        title: a.title || 'Untitled album',
        subtitle: `${displayNameOf(a.user)}${a.location_name ? ` · ${a.location_name}` : ''}`,
        href: `/albums/${a.id}`,
        hrefLabel: 'View album',
      }))
    },
  })

  // ── Trips: every pinned stop across your trip plans ─────────────────────
  const tripsQuery = useQuery<ExploreMapPin[]>({
    queryKey: ['map-trips', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiFetch('/api/trips')
      if (!res.ok) throw new Error(`Trips API ${res.status}`)
      const { trips } = (await res.json()) as { trips: TripListEntry[] }

      // Only fetch details for trips that actually have pins (pin_count is in
      // the list response), capped to keep the fan-out bounded.
      const withPins = (trips || []).filter((t) => (t.pin_count ?? 0) > 0).slice(0, 12)
      const details = await Promise.all(
        withPins.map(async (t) => {
          const r = await apiFetch(`/api/trips/${t.id}`)
          return r.ok ? ((await r.json()) as { pins?: TripPinRow[] }) : null
        })
      )

      return details.flatMap((d, i) =>
        (d?.pins || []).filter(hasCoords).map((p) => ({
          id: p.id,
          kind: 'trips' as const,
          latitude: p.latitude,
          longitude: p.longitude,
          title: p.name,
          subtitle: `Trip: ${withPins[i].title}`,
          href: `/trips/${withPins[i].id}`,
          hrefLabel: 'Open trip',
        }))
      )
    },
  })

  // ── Wishlist: bucket-list destinations + places saved from links ────────
  const wishlistQuery = useQuery<ExploreMapPin[]>({
    queryKey: ['map-wishlist', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiFetch('/api/wishlist')
      if (!res.ok) throw new Error(`Wishlist API ${res.status}`)
      const { items } = (await res.json()) as { items: WishlistItemRow[] }
      return (items || []).filter(hasCoords).map((w) => ({
        id: w.id,
        kind: 'wishlist' as const,
        latitude: w.latitude!,
        longitude: w.longitude!,
        title: w.location_name,
        subtitle: w.completed_at
          ? 'Wishlist · visited ✓'
          : w.source_platform && w.source_platform !== 'manual'
            ? `Saved from ${PLATFORM_LABEL[w.source_platform] || 'a link'}`
            : `Wishlist${w.priority ? ` · ${w.priority} priority` : ''}`,
        href: '/wishlist',
        hrefLabel: 'Open wishlist',
        externalUrl: w.source_url ?? null,
      }))
    },
  })

  const layerQueries: Record<MapLayerKind, typeof friendsQuery> = {
    friends: friendsQuery,
    trips: tripsQuery,
    wishlist: wishlistQuery,
  }

  const pins = useMemo<ExploreMapPin[]>(
    () =>
      (Object.keys(layerQueries) as MapLayerKind[]).flatMap((kind) =>
        enabled[kind] ? layerQueries[kind].data ?? [] : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, friendsQuery.data, tripsQuery.data, wishlistQuery.data]
  )

  const anyLoading = Object.values(layerQueries).some((q) => q.isPending)
  const failedLayers = (Object.keys(layerQueries) as MapLayerKind[]).filter(
    (k) => layerQueries[k].isError
  )
  const allEmpty =
    !anyLoading && failedLayers.length === 0 && pins.length === 0

  const handleLocate = async () => {
    setLocating(true)
    try {
      const loc = await getCurrentLocation()
      if (loc) {
        setMe({ latitude: loc.latitude, longitude: loc.longitude })
        setFlyTarget({ lat: loc.latitude, lng: loc.longitude, zoom: 13, ts: Date.now() })
      } else {
        // getCurrentLocation already showed a permission/failure toast.
        toast.error('Could not get your location')
      }
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Friends&apos; travels, your plans, and saved places — all in one view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sibling 3D view — mirrors the Map link in the globe's header. */}
          <Link
            href="/globe"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GlobeIcon className="h-4 w-4" />
            Globe
          </Link>
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            My location
          </button>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(LAYER_META) as MapLayerKind[]).map((kind) => {
          const meta = LAYER_META[kind]
          const query = layerQueries[kind]
          const count = query.data?.length ?? 0
          const on = enabled[kind]
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setEnabled((prev) => ({ ...prev, [kind]: !prev[kind] }))}
              aria-pressed={on}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
              style={on ? { backgroundColor: meta.color } : undefined}
            >
              <span aria-hidden>{meta.glyph}</span>
              {meta.label}
              <span className={cn('text-xs', on ? 'text-white/80' : 'text-muted-foreground')}>
                {query.isPending ? '…' : count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Partial-failure notice (a broken layer must not look like "no pins") */}
      {failedLayers.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Couldn&apos;t load: {failedLayers.map((k) => LAYER_META[k].label).join(', ')}.
          </span>
          <button
            type="button"
            onClick={() => failedLayers.forEach((k) => layerQueries[k].refetch())}
            className="font-semibold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* The map */}
      <div className="h-[calc(100dvh-330px)] min-h-[420px] lg:h-[calc(100dvh-280px)]">
        <ExploreMap pins={pins} me={me} flyTarget={flyTarget} />
      </div>

      {allEmpty && (
        <p className="text-sm text-muted-foreground text-center">
          No pins yet — follow some friends, plan a trip, add wishlist spots, or paste a TikTok
          link on the Saved page to fill your map.
        </p>
      )}
    </div>
  )
}
