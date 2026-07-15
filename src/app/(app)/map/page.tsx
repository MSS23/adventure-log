'use client'

/**
 * /map — one 2D map of your travel world:
 *   · Been    — your own album locations (places you've actually been)
 *   · Friends — album locations from people you follow (public/friends posts)
 *   · Trips   — every stop pinned in your trip plans
 *   · Wishlist — bucket-list destinations
 *   · Friends recommend — places people you follow posted as recommendations
 *     ("Rohan recommends" pins, attributed to the recommender)
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
import {
  LocateFixed,
  Loader2,
  AlertTriangle,
  Globe as GlobeIcon,
  HelpCircle,
  Map as MapIcon,
  MapPinned,
  Layers,
  MessageCircleHeart,
  Route,
  Star,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { WalkthroughTour, type TourStep } from '@/components/ui/walkthrough-tour'
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

interface BeenAlbumRow {
  id: string
  title: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  date_start: string | null
  created_at: string
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
  sort_order: number | null
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

interface FriendRecRow {
  id: string
  title: string
  tip: string | null
  city: string
  place_type: string | null
  latitude: number
  longitude: number
  user?: { username: string | null; display_name: string | null } | null
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  google_maps: 'Google Maps',
  instagram: 'Instagram',
  manual: 'manual entry',
  other: 'a link',
}

const LAYER_ICONS: Record<MapLayerKind, LucideIcon> = {
  been: MapPinned,
  friends: UsersRound,
  trips: Route,
  wishlist: Star,
  recs: MessageCircleHeart,
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
    been: true,
    friends: true,
    trips: true,
    wishlist: true,
    recs: true,
  })
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null)
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null)
  const [locating, setLocating] = useState(false)

  // ── Been: your own album locations ───────────────────────────────────────
  const beenQuery = useQuery<ExploreMapPin[]>({
    queryKey: ['map-been', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('id, title, location_name, latitude, longitude, date_start, created_at')
        .eq('user_id', userId!)
        .or('status.is.null,status.neq.draft')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(500)
      if (error) throw error

      return ((data || []) as BeenAlbumRow[])
        .filter(hasCoords)
        .sort((a, b) => {
          const aTime = Date.parse(a.date_start || a.created_at)
          const bTime = Date.parse(b.date_start || b.created_at)
          return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0)
        })
        .map((album, routeOrder) => ({
          id: album.id,
          kind: 'been' as const,
          latitude: album.latitude!,
          longitude: album.longitude!,
          title: album.title || 'Untitled album',
          subtitle: album.location_name ? `You were here · ${album.location_name}` : 'You were here',
          href: `/albums/${album.id}`,
          hrefLabel: 'View album',
          routeGroup: `been-${userId}`,
          routeOrder,
        }))
    },
  })

  // ── Friends recommend: attributed picks from people you follow ──────────
  const recsQuery = useQuery<ExploreMapPin[]>({
    queryKey: ['map-friend-recs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiFetch('/api/place-recommendations?scope=friends&limit=200')
      if (!res.ok) throw new Error(`Recommendations API ${res.status}`)
      const { recommendations } = (await res.json()) as { recommendations: FriendRecRow[] }
      return (recommendations || []).filter(hasCoords).map((r) => {
        const who = r.user?.display_name || r.user?.username || 'A friend'
        return {
          id: r.id,
          kind: 'recs' as const,
          latitude: r.latitude,
          longitude: r.longitude,
          title: r.title,
          subtitle: `${who} recommends${r.tip ? ` — “${r.tip.slice(0, 80)}${r.tip.length > 80 ? '…' : ''}”` : ''}`,
          href: `/explore/recommendations?city=${encodeURIComponent(r.city)}`,
          hrefLabel: 'See recommendations',
        }
      })
    },
  })

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

      return details.flatMap((detail, tripIndex) =>
        (detail?.pins || [])
          .filter(hasCoords)
          .sort(
            (a, b) =>
              (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
              (b.sort_order ?? Number.MAX_SAFE_INTEGER)
          )
          .map((pin, routeOrder) => ({
            id: pin.id,
            kind: 'trips' as const,
            latitude: pin.latitude,
            longitude: pin.longitude,
            title: pin.name,
            subtitle: `Trip: ${withPins[tripIndex].title}`,
            href: `/trips/${withPins[tripIndex].id}`,
            hrefLabel: 'Open trip',
            routeGroup: `trip-${withPins[tripIndex].id}`,
            routeOrder,
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
    been: beenQuery,
    friends: friendsQuery,
    trips: tripsQuery,
    wishlist: wishlistQuery,
    recs: recsQuery,
  }

  const pins = useMemo<ExploreMapPin[]>(
    () =>
      (Object.keys(layerQueries) as MapLayerKind[]).flatMap((kind) =>
        enabled[kind] ? layerQueries[kind].data ?? [] : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, beenQuery.data, friendsQuery.data, tripsQuery.data, wishlistQuery.data, recsQuery.data]
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

  // First-run tour — the layer pills are the whole interface, so three quick
  // steps stop the five-layer map from feeling like a wall of pins.
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        target: 'map-header',
        title: 'Your travel map',
        description:
          "Everything in one view: places you've been, friends' travels, trip plans, your wishlist, and spots friends recommend.",
        icon: <MapIcon className="h-5 w-5" />,
        placement: 'bottom' as const,
        spotlightPadding: 12,
      },
      {
        target: 'map-layer-pills',
        title: 'Show only what you want',
        description:
          'Tap a pill to hide or show that layer. Each shows how many pins it adds — turn everything off except one to focus.',
        icon: <Layers className="h-5 w-5" />,
        placement: 'bottom' as const,
        spotlightPadding: 10,
      },
      {
        target: 'map-recs-pill',
        title: 'Friends recommend',
        description:
          'Recommendation pins use the speech-and-heart marker. Open one to see who suggested it and their tip.',
        icon: <MessageCircleHeart className="h-5 w-5" />,
        placement: 'bottom' as const,
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <WalkthroughTour tourId="map-tour" steps={tourSteps} autoStart={true}>
        {(startTour) => (
          <button
            type="button"
            id="map-tour-restart-trigger"
            onClick={startTour}
            className="hidden"
            aria-hidden
          />
        )}
      </WalkthroughTour>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3" data-tour-step="map-header">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Your map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where you&apos;ve been, where you&apos;re going, and what friends recommend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById('map-tour-restart-trigger')?.click()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Take a tour"
            aria-label="Take a tour of the map"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {/* Sibling 3D view — mirrors the Map link in the globe's header. */}
          <Link
            href="/globe"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GlobeIcon className="h-4 w-4" />
            Globe
          </Link>
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-card/80 p-1.5 shadow-sm backdrop-blur-xl"
        data-tour-step="map-layer-pills"
      >
        {(Object.keys(LAYER_META) as MapLayerKind[]).map((kind) => {
          const meta = LAYER_META[kind]
          const LayerIcon = LAYER_ICONS[kind]
          const query = layerQueries[kind]
          const count = query.data?.length ?? 0
          const on = enabled[kind]
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setEnabled((prev) => ({ ...prev, [kind]: !prev[kind] }))}
              aria-pressed={on}
              {...(kind === 'recs' ? { 'data-tour-step': 'map-recs-pill' } : {})}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on
                  ? 'shadow-sm'
                  : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              style={
                on
                  ? {
                      backgroundColor: `${meta.color}14`,
                      borderColor: `${meta.color}40`,
                      color: meta.color,
                    }
                  : undefined
              }
            >
              <LayerIcon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              {meta.label}
              <span
                className={cn(
                  'inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                  on ? 'bg-background/70' : 'bg-muted text-muted-foreground'
                )}
              >
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
        <ExploreMap pins={pins} me={me} flyTarget={flyTarget} loading={anyLoading} />
      </div>

      {allEmpty && (
        <p className="text-sm text-muted-foreground text-center">
          No pins yet — post an album with a location, follow some friends, plan a trip, or add
          wishlist spots to fill your map.
        </p>
      )}
    </div>
  )
}
