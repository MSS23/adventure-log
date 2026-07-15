'use client'

/**
 * /map — timely place context based on where the user is now:
 *   · Friends — album locations from people they follow (public/friends posts)
 *   · Wishlist — saved destinations, including places imported from links
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
  CarFront,
  Footprints,
  Globe as GlobeIcon,
  HelpCircle,
  Map as MapIcon,
  Layers,
  MessageCircleHeart,
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
import {
  distanceInKilometres,
  estimateTravelTime,
  formatDistance,
} from '@/components/map/map-proximity'

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
  date_start: string | null
  created_at: string
  user:
    | { username: string | null; display_name: string | null }
    | { username: string | null; display_name: string | null }[]
    | null
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

type DiscoveryLayerKind = Extract<MapLayerKind, 'friends' | 'wishlist' | 'recs'>

const DISCOVERY_LAYERS: DiscoveryLayerKind[] = ['friends', 'recs', 'wishlist']

const LAYER_ICONS: Record<DiscoveryLayerKind, LucideIcon> = {
  friends: UsersRound,
  wishlist: Star,
  recs: MessageCircleHeart,
}

function displayNameOf(user: FriendAlbumRow['user']): string {
  const u = Array.isArray(user) ? user[0] : user
  return u?.display_name || u?.username || 'A friend'
}

const hasCoords = (p: { latitude: number | null; longitude: number | null }) =>
  typeof p.latitude === 'number' && typeof p.longitude === 'number'

function relativeVisitDate(value: string | null): string {
  if (!value) return 'a while ago'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'a while ago'

  const years = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (years >= 2) return `${years} years ago`
  if (years === 1) return 'last year'

  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date)
}

export default function MapPage() {
  const { user } = useAuth()
  const userId = user?.id
  const supabase = useMemo(() => createClient(), [])

  const [enabled, setEnabled] = useState<Record<DiscoveryLayerKind, boolean>>({
    friends: true,
    wishlist: true,
    recs: true,
  })
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null)
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null)
  const [locating, setLocating] = useState(false)

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
          'id, title, location_name, latitude, longitude, date_start, created_at, user:users!albums_user_id_fkey(username, display_name)'
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

      return ((data || []) as FriendAlbumRow[]).filter(hasCoords).map((a) => {
        const who = displayNameOf(a.user)
        const visited = relativeVisitDate(a.date_start || a.created_at)
        return {
          id: a.id,
          kind: 'friends' as const,
          latitude: a.latitude!,
          longitude: a.longitude!,
          title: a.location_name || a.title || 'A friend was here',
          subtitle: `${who} was here ${visited}${a.title ? ` · ${a.title}` : ''}`,
          href: `/albums/${a.id}`,
          hrefLabel: 'See their album',
        }
      })
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

  const layerQueries: Record<DiscoveryLayerKind, typeof friendsQuery> = {
    friends: friendsQuery,
    wishlist: wishlistQuery,
    recs: recsQuery,
  }

  const pins = useMemo<ExploreMapPin[]>(
    () =>
      DISCOVERY_LAYERS.flatMap((kind) =>
        enabled[kind] ? layerQueries[kind].data ?? [] : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, friendsQuery.data, wishlistQuery.data, recsQuery.data]
  )

  const nearbyPins = useMemo(() => {
    if (!me) return []
    return pins
      .map((pin) => {
        const distanceKm = distanceInKilometres(me, pin)
        return { pin, distanceKm, estimate: estimateTravelTime(distanceKm) }
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
  }, [me, pins])

  const anyLoading = Object.values(layerQueries).some((q) => q.isPending)
  const failedLayers = DISCOVERY_LAYERS.filter(
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

  // First-run tour: explain the three contextual layers without interrupting
  // the user's ability to pan or inspect the map.
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        target: 'map-header',
        title: 'Useful places around you',
        description:
          'Share your location when you need it and the map brings nearby friend visits, recommendations, and wishlist saves to the surface.',
        icon: <MapIcon className="h-5 w-5" />,
        placement: 'bottom' as const,
        spotlightPadding: 12,
      },
      {
        target: 'map-layer-pills',
        title: 'Choose the context',
        description:
          'Filter between places friends visited, recommendations, and your wishlist. Pins are never joined by travel lines.',
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
          <p className="al-eyebrow mb-1">Around you</p>
          <h1 className="al-display text-3xl sm:text-4xl text-foreground">Your map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timely places from people you trust, plus the places you saved for later.
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
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {me ? 'Refresh location' : 'Use my location'}
          </button>
        </div>
      </div>

      {/* Layer toggles */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-card/80 p-1.5 shadow-sm backdrop-blur-xl"
        data-tour-step="map-layer-pills"
      >
        {DISCOVERY_LAYERS.map((kind) => {
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

      {/* The map + proximity briefing */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[58dvh] min-h-[440px] lg:h-[calc(100dvh-290px)]">
          <ExploreMap pins={pins} me={me} flyTarget={flyTarget} loading={anyLoading} />
        </div>

        <aside
          className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-resting)] lg:overflow-y-auto"
          data-tour-step="map-nearby"
          aria-label="Places near your current location"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="al-eyebrow">Right now</p>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {me ? 'Closest to you' : 'What is nearby?'}
              </h2>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <LocateFixed className="h-5 w-5" aria-hidden />
            </span>
          </div>

          {!me ? (
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Use your location to find the friend recommendation or wishlist place that is useful now.
              </p>
              <button
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                Find places near me
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Your live location is used for this view and is not added to your profile.
              </p>
            </div>
          ) : nearbyPins.length > 0 ? (
            <div className="space-y-2.5">
              {nearbyPins.map(({ pin, distanceKm, estimate }) => {
                const NearbyIcon = LAYER_ICONS[pin.kind as DiscoveryLayerKind]
                const TravelIcon = estimate.mode === 'walk' ? Footprints : CarFront
                return (
                  <div key={`${pin.kind}-${pin.id}`} className="rounded-2xl border border-border bg-background p-3">
                    <button
                      type="button"
                      onClick={() => setFlyTarget({ lat: pin.latitude, lng: pin.longitude, zoom: 14, ts: Date.now() })}
                      className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                          style={{ backgroundColor: `${LAYER_META[pin.kind].color}18`, color: LAYER_META[pin.kind].color }}
                        >
                          <NearbyIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-snug text-foreground">{pin.title}</span>
                          {pin.subtitle && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{pin.subtitle}</span>
                          )}
                        </span>
                      </div>
                      <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
                        <TravelIcon className="h-3.5 w-3.5" aria-hidden />
                        {estimate.label}
                        <span className="font-normal text-muted-foreground">&middot; {formatDistance(distanceKm)}</span>
                      </span>
                    </button>
                    {pin.href && (
                      <Link
                        href={pin.href}
                        className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {pin.hrefLabel || 'Open place'}
                      </Link>
                    )}
                  </div>
                )
              })}
              <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
                Times are approximate. Open the place for live directions.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
              No visible places nearby. Turn on a map filter or add somewhere to your wishlist.
            </p>
          )}
        </aside>
      </div>

      {allEmpty && (
        <p className="text-sm text-muted-foreground text-center">
          No useful places yet — follow friends who share albums or recommendations, or add a
          place to your wishlist.
        </p>
      )}
    </div>
  )
}
