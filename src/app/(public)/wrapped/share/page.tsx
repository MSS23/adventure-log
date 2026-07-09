'use client'

/**
 * PUBLIC Travel Wrapped — /wrapped/share?u=<username>&year=<YYYY|all>
 *
 * The landing surface for shared Wrapped links. Works fully anonymously:
 * the anon Supabase client resolves the owner by username (users table is
 * world-readable for undeleted rows) and useWrappedData's album query is
 * scoped by RLS to visibility='public' albums. No auth, no server — this
 * page ships in the static mobile export too.
 *
 * Owner-only actions (download card, replay-into-globe deep links, mode
 * toggle) are intentionally absent; the conversion CTA is persistent.
 */

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  Suspense,
  Component,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { useWrappedData } from '@/lib/hooks/useWrappedData'
import { FlightReelOverlay } from '@/components/wrapped/FlightReelOverlay'
import { createClient } from '@/lib/supabase/client'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getFlagEmoji } from '@/lib/utils/country'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import {
  Loader2,
  Plane,
  ChevronRight,
  MapPin,
  Camera,
  Globe as GlobeIcon,
  Route,
  Sparkles,
  Calendar,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Globe crashes must not take down a conversion page — same guard the
// authed /wrapped page uses (its boundary is module-private there).
class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full flex items-center justify-center bg-black/50">
          <div className="text-center text-white/65">
            <GlobeIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Globe unavailable</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const WrappedGlobe = dynamic(
  () =>
    import('@/components/wrapped/WrappedGlobe').then((m) => ({
      default: m.WrappedGlobe,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-400" />
      </div>
    ),
  }
)

type Phase = 'intro' | 'globe' | 'stats'

interface OwnerProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  privacy_level: string | null
}

export default function PublicWrappedSharePage() {
  // useSearchParams needs a Suspense boundary for static prerender.
  return (
    <Suspense
      fallback={
        <div className="dark fixed inset-0 z-[60] bg-black flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-olive-400 animate-spin" />
        </div>
      }
    >
      <PublicWrappedExperience />
    </Suspense>
  )
}

function PublicWrappedExperience() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const currentYear = new Date().getFullYear()

  const username = searchParams.get('u')
  const yearRaw = searchParams.get('year')
  const year: number | 'all' =
    yearRaw === 'all'
      ? 'all'
      : yearRaw && /^\d{4}$/.test(yearRaw)
        ? Number(yearRaw)
        : currentYear
  const label = year === 'all' ? 'All-Time' : String(year)

  // ── Resolve the Wrapped owner (anon client + RLS) ─────────────────────
  const [owner, setOwner] = useState<OwnerProfile | null>(null)
  const [ownerStatus, setOwnerStatus] = useState<'loading' | 'ready' | 'notfound'>(
    'loading'
  )
  useEffect(() => {
    if (!username) {
      setOwnerStatus('notfound')
      return
    }
    let cancelled = false
    setOwner(null)
    setOwnerStatus('loading')
    ;(async () => {
      const supabase = createClient()
      const { data: row } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, privacy_level')
        .eq('username', username)
        .maybeSingle()
      if (cancelled) return
      if (row) {
        setOwner(row as OwnerProfile)
        setOwnerStatus('ready')
      } else {
        setOwnerStatus('notfound')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [username])

  const isPrivate = owner?.privacy_level === 'private'
  const data = useWrappedData(isPrivate ? undefined : owner?.id, year)

  // ── Growth analytics: one anonymous view event per mount ──────────────
  const viewTracked = useRef(false)
  useEffect(() => {
    if (viewTracked.current || !username) return
    viewTracked.current = true
    trackGrowthEvent('wrapped_public_view', { meta: { username, year } })
  }, [username, year])

  // ── Conversion CTA target — signed-out visitors go to signup with the
  // owner as referrer; signed-in visitors go watch their own Wrapped. ────
  const signupHref = useMemo(() => {
    const origin = getWebOrigin()
    if (origin) return withRef(`${origin}/signup`, username)
    // Prerender fallback (no window): a relative link that still carries ref.
    return username ? `/signup?ref=${encodeURIComponent(username)}` : '/signup'
  }, [username])
  const ctaHref = user ? '/wrapped' : signupHref
  const ctaLabel = user ? 'Watch your own Wrapped' : 'Make your own travel Wrapped'

  const displayName =
    owner?.display_name || owner?.username || username || 'A traveler'
  const firstName = displayName.split(' ')[0]

  // Client-side <title> — a 'use client' page can't export generateMetadata.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const prev = document.title
    document.title = `${displayName}'s ${label} Travel Wrapped · Adventure Log`
    return () => {
      document.title = prev
    }
  }, [displayName, label])

  const [phase, setPhase] = useState<Phase>('intro')
  const [flightProgress, setFlightProgress] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(-1)

  const globeLocations = useMemo(() => data.locations, [data.locations])

  const startWrapped = useCallback(() => {
    if (data.locations.length < 2) {
      setPhase('stats')
    } else {
      setPhase('globe')
    }
  }, [data.locations.length])

  const handleGlobeProgress = useCallback((progress: number, idx: number) => {
    setFlightProgress(progress)
    setSegmentIndex(idx)
  }, [])

  const handleGlobeComplete = useCallback(() => {
    setTimeout(() => setPhase('stats'), 1500)
  }, [])

  // Pins open the PUBLIC album page — the only album surface an anonymous
  // visitor can act on.
  const handlePinClick = useCallback(
    (loc: { albumId?: string }) => {
      if (loc.albumId) router.push(`/albums/${loc.albumId}/public`)
    },
    [router]
  )

  // ── Persistent, unobtrusive CTA chrome (all states render inside it) ──
  const chrome = (children: ReactNode) => (
    <div className="dark fixed inset-0 z-[60] bg-black overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-400 rounded-md"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 border border-white/15">
            <GlobeIcon className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-heading text-sm font-semibold hidden sm:inline">
            Adventure Log
          </span>
        </Link>
        <Link href={ctaHref}>
          <Button
            size="sm"
            className="al-btn-coral cursor-pointer text-white font-semibold rounded-full px-4 gap-1.5 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {ctaLabel}
          </Button>
        </Link>
      </div>
      {children}
    </div>
  )

  // ── Early states ──────────────────────────────────────────────────────
  if (ownerStatus === 'loading' || (!isPrivate && ownerStatus === 'ready' && data.loading)) {
    return chrome(
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-olive-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading {displayName}&apos;s journey...</p>
        </div>
      </div>
    )
  }

  if (ownerStatus === 'notfound') {
    return chrome(
      <EmptyState
        icon={<Plane className="h-16 w-16 text-olive-400/70" aria-hidden />}
        title="Traveler not found"
        body={
          username
            ? `We couldn't find @${username}. They may have changed their username.`
            : 'This link is missing a traveler. Ask your friend to share their Wrapped again.'
        }
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    )
  }

  if (isPrivate) {
    return chrome(
      <EmptyState
        icon={<Lock className="h-16 w-16 text-olive-400/70" aria-hidden />}
        title={`${firstName}'s year is private`}
        body={`${displayName} keeps their adventures just for themselves. You can still make your own — it takes a few photos and a minute.`}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    )
  }

  if (data.error) {
    return chrome(
      <EmptyState
        icon={<Plane className="h-16 w-16 text-olive-400/70" aria-hidden />}
        title="Couldn't load this Wrapped"
        body="We couldn't reach the server. Give it another try."
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        extra={
          <Button
            onClick={() => data.retry()}
            size="lg"
            className="cursor-pointer px-8 focus-visible:ring-offset-black"
          >
            Try again
          </Button>
        }
      />
    )
  }

  if (data.totalTrips === 0) {
    return chrome(
      <EmptyState
        icon={<Lock className="h-16 w-16 text-olive-400/70" aria-hidden />}
        title={`${firstName}'s ${year === 'all' ? 'adventures are' : `${year} is`} private`}
        body={`${displayName} hasn't shared any public trips ${year === 'all' ? 'yet' : `for ${year}`}. Make your own Wrapped and show them how it's done.`}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    )
  }

  // ── The experience ────────────────────────────────────────────────────
  return chrome(
    <AnimatePresence mode="wait">
      {phase === 'intro' && (
        <motion.div
          key="intro"
          className="absolute inset-0 flex flex-col items-center justify-center text-white z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 opacity-25">
            <GlobeErrorBoundary>
              <WrappedGlobe
                locations={globeLocations}
                animate={false}
                onPinClick={handlePinClick}
              />
            </GlobeErrorBoundary>
          </div>

          <div className="relative z-10 text-center px-6">
            <motion.div
              className="mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny avatar, next/image adds no value */}
              <img
                src={getAvatarUrl(owner?.avatar_url ?? null, owner?.username || undefined)}
                alt=""
                className="h-16 w-16 rounded-full object-cover border-2 border-white/25 mx-auto"
              />
            </motion.div>
            <motion.h1
              className="al-display text-5xl md:text-7xl !text-white mb-3"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {year === 'all' ? `${firstName}'s` : `${firstName}'s ${year}`}
            </motion.h1>
            <motion.h2
              className="text-2xl md:text-3xl font-light tracking-wide text-white/85 mb-2"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Travel Wrapped
            </motion.h2>
            <motion.p
              className="text-lg text-white/70 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              @{owner?.username ?? username}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={startWrapped}
                size="lg"
                className="cursor-pointer px-10 py-6 text-lg rounded-full gap-2 focus-visible:ring-offset-black"
              >
                <Plane className="h-5 w-5" />
                Watch {firstName}&apos;s Journey
                <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>

            <motion.div
              className="mt-8 flex gap-4 sm:gap-6 justify-center items-center text-white/70 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              <span>
                <span className="font-semibold text-white">{data.totalTrips}</span> trips
              </span>
              <span className="text-white/25" aria-hidden>
                &middot;
              </span>
              <span>
                <span className="font-semibold text-white">{data.countryCodes.length}</span>{' '}
                countries
              </span>
              <span className="text-white/25" aria-hidden>
                &middot;
              </span>
              <span>
                <span className="font-semibold text-white">
                  {data.totalDistanceKm.toLocaleString()}
                </span>{' '}
                km
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {phase === 'globe' && (
        <motion.div
          key="globe"
          className="absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlobeErrorBoundary
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center text-white/60">
                  <GlobeIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="mb-4">Globe couldn&apos;t load</p>
                  <Button onClick={() => setPhase('stats')}>View Stats Instead</Button>
                </div>
              </div>
            }
          >
            <WrappedGlobe
              locations={globeLocations}
              animate={true}
              onProgress={handleGlobeProgress}
              onAnimationComplete={handleGlobeComplete}
              onPinClick={handlePinClick}
            />
          </GlobeErrorBoundary>

          {/* Flight progress bar — below the CTA chrome row. */}
          <div className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-30">
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden shadow-sm">
              <motion.div
                className="h-full bg-gradient-to-r from-olive-500 to-olive-400 rounded-full"
                animate={{ width: `${flightProgress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <FlightReelOverlay
            locations={globeLocations}
            segmentIndex={segmentIndex}
            progress={flightProgress}
          />

          <div className="absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+1rem)] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-30">
            <motion.div
              className="flex justify-center gap-3 sm:gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: flightProgress > 0.3 ? 1 : 0,
                y: flightProgress > 0.3 ? 0 : 30,
              }}
              transition={{ duration: 0.6 }}
            >
              <StatPill
                icon={<MapPin className="h-3.5 w-3.5" />}
                value={data.totalTrips}
                label="trips"
              />
              <StatPill
                icon={<GlobeIcon className="h-3.5 w-3.5" />}
                value={data.countryCodes.length}
                label="countries"
              />
              <StatPill
                icon={<Route className="h-3.5 w-3.5" />}
                value={`${data.totalDistanceKm.toLocaleString()} km`}
                label="traveled"
              />
            </motion.div>
          </div>

          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30">
            <Button
              onClick={() => setPhase('stats')}
              variant="ghost"
              size="sm"
              className="cursor-pointer text-white/70 hover:text-white text-xs transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 min-h-[44px] min-w-[44px]"
            >
              Skip
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'stats' && (
        <motion.div
          key="stats"
          className="absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 opacity-30">
            <GlobeErrorBoundary>
              <WrappedGlobe
                locations={globeLocations}
                animate={false}
                onPinClick={handlePinClick}
              />
            </GlobeErrorBoundary>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40 z-10" />

          {/* Centering lives on an inner min-h-full wrapper: justify-center
              directly on the scroll container pushes overflow above the
              scroll start edge, clipping the top unreachably on phones. */}
          <div className="absolute inset-0 z-20 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))] pb-[max(2rem,env(safe-area-inset-bottom))]">
            <motion.div
              className="text-center mb-5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Sparkles className="h-7 w-7 mx-auto mb-2 text-olive-400" />
              <p className="al-eyebrow !text-olive-400 mb-1">
                {firstName}&apos;s travel personality
              </p>
              <h2 className="al-display text-3xl sm:text-4xl md:text-5xl !text-white">
                {data.personality}
              </h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-md w-full mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <StatCard
                value={data.totalTrips}
                label="Adventures"
                icon={<Plane className="h-5 w-5" />}
              />
              <StatCard
                value={data.countryCodes.length}
                label="Countries"
                icon={<GlobeIcon className="h-5 w-5" />}
              />
              <StatCard
                value={data.totalPhotos}
                label="Photos"
                icon={<Camera className="h-5 w-5" />}
              />
              <StatCard
                value={`${data.totalDistanceKm.toLocaleString()}`}
                label="Kilometers"
                icon={<Route className="h-5 w-5" />}
              />
              <StatCard
                value={data.cities.length}
                label="Cities"
                icon={<MapPin className="h-5 w-5" />}
              />
              <StatCard
                value={data.travelMonths.length}
                label="Months"
                icon={<Calendar className="h-5 w-5" />}
              />
            </motion.div>

            {data.countryCodes.length > 0 && (
              <motion.div
                className="flex flex-wrap items-center justify-center gap-1.5 mb-5 max-w-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {data.countryCodes.slice(0, 18).map((code, i) => (
                  <motion.span
                    key={code}
                    className="text-2xl leading-none"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + Math.min(i, 12) * 0.05, type: 'spring' }}
                  >
                    {getFlagEmoji(code)}
                  </motion.span>
                ))}
                {data.countryCodes.length > 18 && (
                  <span className="text-white/70 text-sm font-medium">
                    +{data.countryCodes.length - 18}
                  </span>
                )}
              </motion.div>
            )}

            {data.totalDistanceKm > 0 && (
              <motion.p
                className="text-white/75 text-xs sm:text-sm mb-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <GlobeIcon
                  className="inline-block h-4 w-4 mr-1.5 -mt-0.5 text-olive-400"
                  aria-hidden
                />
                {data.totalDistanceKm >= 40075
                  ? `That's ${(data.totalDistanceKm / 40075).toFixed(1)}x around the Earth!`
                  : `That's ${((data.totalDistanceKm / 40075) * 100).toFixed(0)}% around the Earth`}
              </motion.p>
            )}

            {data.topAlbums.length > 0 && (
              <motion.div
                className="w-full max-w-md mb-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <p className="al-eyebrow !text-olive-400 text-center mb-2.5">Top adventures</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {data.topAlbums.map((album, i) => (
                    <motion.button
                      key={album.id}
                      type="button"
                      onClick={() => router.push(`/albums/${album.id}/public`)}
                      className="cursor-pointer group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/15 shadow-lg shadow-black/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-400 active:scale-[0.97] transition-transform duration-200"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.05 + i * 0.08, type: 'spring', stiffness: 220, damping: 20 }}
                      aria-label={`View the album ${album.title}`}
                    >
                      {album.cover_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- decorative cover in a fixed-size tile; next/image adds no value at this size
                        <img
                          src={album.cover_photo_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-white/[0.07] flex items-center justify-center">
                          <Camera className="h-6 w-6 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2">
                        <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
                          {album.title}
                        </p>
                        <p className="text-white/65 text-[10px] mt-0.5 tabular-nums">
                          {album.photo_count} photo{album.photo_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Conversion block — the whole point of this page. */}
            <motion.div
              className="flex flex-col items-center gap-3 w-full max-w-md text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-white/80 text-sm">
                {user
                  ? 'Your year deserves a reel like this too.'
                  : `Your ${year === 'all' ? 'adventures deserve' : `${year} deserves`} a reel like this too — it's free.`}
              </p>
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.3, type: 'spring', stiffness: 260, damping: 18 }}
                className="w-full sm:w-auto"
              >
                <Link href={ctaHref}>
                  <Button
                    size="lg"
                    className="al-btn-coral cursor-pointer w-full sm:w-auto text-white font-semibold px-10 py-6 text-base rounded-full gap-2 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <Sparkles className="h-5 w-5" />
                    {ctaLabel}
                  </Button>
                </Link>
              </motion.div>
              <button
                type="button"
                onClick={() => {
                  setPhase('intro')
                  setFlightProgress(0)
                  setSegmentIndex(-1)
                }}
                className="cursor-pointer text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-sm"
              >
                Replay
              </button>
              <p className="al-eyebrow !text-white/55 mt-1">Adventure Log</p>
            </motion.div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EmptyState({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
  extra,
}: {
  icon: ReactNode
  title: string
  body: string
  ctaHref: string
  ctaLabel: string
  extra?: ReactNode
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
      <div className="mb-6">{icon}</div>
      <h1 className="text-3xl font-bold mb-3 text-center">{title}</h1>
      <p className="text-white/75 text-center mb-6 max-w-md">{body}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {extra}
        <Link href={ctaHref}>
          <Button
            size="lg"
            className="al-btn-coral cursor-pointer text-white font-semibold px-8 rounded-full gap-2 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Sparkles className="h-4 w-4" />
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: string | number
  label: string
}) {
  return (
    <div className="flex items-center gap-2 bg-black/55 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 shadow-lg shadow-black/30">
      <span className="text-olive-400">{icon}</span>
      <span className="text-white font-bold text-sm tabular-nums">{value}</span>
      <span className="text-white/70 text-xs">{label}</span>
    </div>
  )
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: string | number
  label: string
  icon: ReactNode
}) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center border border-white/15 shadow-lg shadow-black/20">
      <div className="text-olive-400 mb-1 flex justify-center">{icon}</div>
      <p className="al-stat-value text-2xl sm:text-3xl !text-white tabular-nums leading-none">
        {value}
      </p>
      <p className="al-eyebrow !text-white/65 mt-1 text-[9px]">{label}</p>
    </div>
  )
}
