'use client'

import { useState, useCallback, useMemo, Component, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/auth/AuthProvider'
import { useWrappedData } from '@/lib/hooks/useWrappedData'
import { FlightReelOverlay } from '@/components/wrapped/FlightReelOverlay'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import {
  Share2,
  Download,
  Loader2,
  Plane,
  X,
  ChevronRight,
  MapPin,
  Camera,
  Globe as GlobeIcon,
  Route,
  Sparkles,
  RotateCcw,
  Calendar,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Error boundary for Globe component - prevents globe crashes from breaking the page
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

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

type Phase = 'intro' | 'globe' | 'stats'

export default function WrappedPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<'year' | 'all'>('year')
  const data = useWrappedData(user?.id, mode === 'all' ? 'all' : currentYear)

  // Pin click: jump into the album on the globe, so user can dive deeper
  const handlePinClick = useCallback(
    (loc: { albumId?: string; lat: number; lng: number }) => {
      if (loc.albumId) {
        router.push(`/globe?album=${loc.albumId}`)
      } else {
        router.push(`/globe?lat=${loc.lat}&lng=${loc.lng}`)
      }
    },
    [router]
  )
  const [phase, setPhase] = useState<Phase>('intro')
  const [flightProgress, setFlightProgress] = useState(0)
  // Tracks which segment of the flight reel is currently playing — used by
  // the FlightReelOverlay to look up the destination album to showcase.
  // -1 = before the first arc; 0..n-1 = arriving at locations[n+1].
  const [segmentIndex, setSegmentIndex] = useState(-1)

  const displayName =
    profile?.display_name || profile?.username || 'Traveler'
  const label = mode === 'all' ? 'All-Time' : String(data.year)

  const globeLocations = useMemo(() => data.locations, [data.locations])

  const switchMode = (newMode: 'year' | 'all') => {
    setMode(newMode)
    setPhase('intro')
    setFlightProgress(0)
    setSegmentIndex(-1)
  }

  const startWrapped = useCallback(() => {
    if (data.locations.length < 2) {
      // Skip globe animation if fewer than 2 locations (no arcs to show)
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

  const handleShare = async () => {
    const shareText = `My ${label} Travel Wrapped: ${data.totalTrips} trips, ${data.countryCodes.length} countries, ${data.totalPhotos} photos, ${data.totalDistanceKm.toLocaleString()} km traveled! I'm a "${data.personality}" — make yours free on Adventure Log:`
    // Share a public landing surface, not this auth-gated /wrapped route —
    // recipients who tap the link should reach a page they can act on.
    const shareUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://adventurelog.com'
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s ${label} Travel Wrapped`,
          text: shareText,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        toast.success('Copied to clipboard!')
      }
    } catch {
      // User cancelled
    }
  }

  // Loading
  if (data.loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-olive-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading your journey...</p>
        </div>
      </div>
    )
  }

  // No trips
  if (data.totalTrips === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-8">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1">
          <Link href="/feed" aria-label="Back to home">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/profile" aria-label="Close">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
            >
              <X className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <Plane className="h-16 w-16 text-olive-400 mb-6" />
        <h1 className="text-3xl font-bold mb-3">
          {mode === 'all' ? 'No Trips Yet' : `No Trips in ${currentYear}`}
        </h1>
        <p className="text-white/75 text-center mb-6 max-w-md">
          Start logging your adventures to see your travel wrapped!
        </p>
        {mode === 'year' && (
          <Button
            onClick={() => switchMode('all')}
            variant="outline"
            className="cursor-pointer border-white/30 text-white hover:bg-white/10 mb-4 transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
          >
            View All-Time Wrapped
          </Button>
        )}
        <Link href="/albums/new">
          <Button size="lg" className="cursor-pointer px-8 focus-visible:ring-offset-black">
            Create Your First Album
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Home + close buttons */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1">
        <Link href="/feed" aria-label="Back to home">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
          >
            <Home className="h-5 w-5" />
          </Button>
        </Link>
        <Link href="/profile" aria-label="Close">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
          >
            <X className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Mode toggle */}
      <div className="absolute top-4 left-4 z-50">
        <div className="flex bg-white/10 backdrop-blur-sm rounded-full p-0.5">
          <button
            type="button"
            onClick={() => switchMode('year')}
            className={cn(
              'cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none min-h-[44px]',
              mode === 'year'
                ? 'bg-white text-black'
                : 'text-white/70 hover:text-white'
            )}
          >
            <Calendar className="h-3 w-3" />
            {currentYear}
          </button>
          <button
            type="button"
            onClick={() => switchMode('all')}
            className={cn(
              'cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none min-h-[44px]',
              mode === 'all'
                ? 'bg-white text-black'
                : 'text-white/70 hover:text-white'
            )}
          >
            All Time
          </button>
        </div>
      </div>

      {/* ===== PHASE: INTRO ===== */}
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
            {/* Background globe (static, dimmed) */}
            <div className="absolute inset-0 opacity-25">
              <GlobeErrorBoundary>
                <WrappedGlobe locations={globeLocations} animate={false} onPinClick={handlePinClick} />
              </GlobeErrorBoundary>
            </div>

            <div className="relative z-10 text-center px-6">
              <motion.div
                className="mb-8"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2 }}
              >
                <Plane className="h-16 w-16 text-olive-400 mx-auto" />
              </motion.div>
              <motion.h1
                className="al-display text-5xl md:text-7xl !text-white mb-3"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {mode === 'all' ? 'Your' : `Your ${data.year}`}
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
                {displayName}
                {mode === 'all' && data.yearsActive > 0 && (
                  <span className="ml-2">
                    &middot; {data.yearsActive}{' '}
                    {data.yearsActive === 1 ? 'year' : 'years'}
                  </span>
                )}
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
                  Watch Your Journey
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </motion.div>

              {/* Quick stats preview */}
              <motion.div
                className="mt-8 flex gap-4 sm:gap-6 justify-center items-center text-white/70 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
              >
                <span><span className="font-semibold text-white">{data.totalTrips}</span> trips</span>
                <span className="text-white/25" aria-hidden>&middot;</span>
                <span><span className="font-semibold text-white">{data.countryCodes.length}</span> countries</span>
                <span className="text-white/25" aria-hidden>&middot;</span>
                <span><span className="font-semibold text-white">{data.totalDistanceKm.toLocaleString()}</span> km</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ===== PHASE: GLOBE ANIMATION ===== */}
        {phase === 'globe' && (
          <motion.div
            key="globe"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Full-screen globe */}
            <GlobeErrorBoundary
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div className="text-center text-white/60">
                    <GlobeIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">Globe couldn&apos;t load</p>
                    <Button onClick={() => setPhase('stats')}>
                      View Stats Instead
                    </Button>
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

            {/* Flight progress bar */}
            <div className="absolute top-16 left-4 right-4 z-30">
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden shadow-sm">
                <motion.div
                  className="h-full bg-gradient-to-r from-olive-500 to-olive-400 rounded-full"
                  animate={{ width: `${flightProgress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Album-cover flight reel — replaces the small city pill with a
                full album showcase that cross-fades each time the plane
                "lands" at a new destination. The user wanted: "the first
                picture of an album shows, the plane go from one destination
                to another, and the next album cover shows." */}
            <FlightReelOverlay
              locations={globeLocations}
              segmentIndex={segmentIndex}
              progress={flightProgress}
            />

            {/* Floating stats that appear as animation progresses */}
            <div className="absolute bottom-8 left-4 right-4 z-30">
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

            {/* Skip button */}
            <div className="absolute bottom-4 right-4 z-30">
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

        {/* ===== PHASE: STATS SUMMARY ===== */}
        {phase === 'stats' && (
          <motion.div
            key="stats"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Globe background (all arcs visible, slowly rotating) */}
            <div className="absolute inset-0 opacity-30">
              <GlobeErrorBoundary>
                <WrappedGlobe locations={globeLocations} animate={false} onPinClick={handlePinClick} />
              </GlobeErrorBoundary>
            </div>

            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40 z-10" />

            {/* Stats content */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 py-20 overflow-y-auto">
              {/* Personality */}
              <motion.div
                className="text-center mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-olive-400" />
                <p className="al-eyebrow !text-olive-400 mb-2">
                  Your travel personality
                </p>
                <h2 className="al-display text-4xl md:text-6xl !text-white">
                  {data.personality}
                </h2>
              </motion.div>

              {/* Stat grid */}
              <motion.div
                className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg w-full mb-8"
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

              {/* Country flags */}
              {data.countryCodes.length > 0 && (
                <motion.div
                  className="flex flex-wrap justify-center gap-2 mb-8 max-w-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {data.countryCodes.map((code, i) => (
                    <motion.span
                      key={code}
                      className="text-3xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.8 + i * 0.08,
                        type: 'spring',
                      }}
                    >
                      {countryCodeToFlag(code)}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              {/* Distance comparison */}
              {data.totalDistanceKm > 0 && (
                <motion.p
                  className="text-white/75 text-sm sm:text-base mb-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <GlobeIcon className="inline-block h-4 w-4 mr-1.5 -mt-0.5 text-olive-400" aria-hidden />
                  {data.totalDistanceKm >= 40075
                    ? `That's ${(data.totalDistanceKm / 40075).toFixed(1)}x around the Earth!`
                    : `That's ${((data.totalDistanceKm / 40075) * 100).toFixed(0)}% around the Earth`}
                </motion.p>
              )}

              {/* Share actions — the viral moment. Lead with a prominent
                  primary CTA; download + replay are secondary. */}
              <motion.div
                className="flex flex-col items-center gap-3 w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.3, type: 'spring', stiffness: 260, damping: 18 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    onClick={handleShare}
                    size="lg"
                    className="al-btn-coral cursor-pointer w-full sm:w-auto text-white font-semibold px-10 py-6 text-base rounded-full gap-2 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <Share2 className="h-5 w-5" />
                    Share My Wrapped
                  </Button>
                </motion.div>

                <div className="flex gap-3 flex-wrap justify-center">
                {user && (
                  <Button
                    onClick={async () => {
                      // Fetch as a blob and trigger an Object-URL download.
                      // The previous version did `<a>.click()` on a freshly-
                      // created element that wasn't appended to DOM, which
                      // is unreliable across browsers — and the API didn't
                      // send Content-Disposition: attachment so even when
                      // the click landed, the browser opened the PNG inline
                      // instead of saving it. Both fixed now (blob path
                      // here, ?download=1 + header server-side).
                      const safeName = `${displayName}-${label}-wrapped.png`.replace(/\s+/g, '-')
                      try {
                        const res = await apiFetch(`/api/travel-card?userId=${user.id}&download=1`)
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                        const blob = await res.blob()
                        const objectUrl = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = objectUrl
                        a.download = safeName
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        // Revoke after a tick so the download has time to start.
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
                        toast.success('Travel card saved!')
                      } catch (err) {
                        log.error(
                          'Travel card download failed',
                          { component: 'WrappedPage', action: 'download-card' },
                          err as Error,
                        )
                        toast.error('Could not download your card. Please try again.')
                      }
                    }}
                    variant="outline"
                    className="cursor-pointer border-white/30 text-white hover:bg-white/10 rounded-full transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Card
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setPhase('intro')
                    setFlightProgress(0)
                    setSegmentIndex(-1)
                  }}
                  variant="ghost"
                  className="cursor-pointer text-white/65 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Replay
                </Button>
                <Link href="/feed">
                  <Button
                    variant="ghost"
                    className="cursor-pointer text-white/65 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
                </div>

                {/* Subtle attribution that travels with screenshots */}
                <motion.p
                  className="al-eyebrow !text-white/55 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  Adventure Log
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
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
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-md rounded-2xl p-4 sm:p-5 text-center border border-white/15 shadow-lg shadow-black/20">
      <div className="text-olive-400 mb-2 flex justify-center">{icon}</div>
      <p className="al-stat-value text-3xl sm:text-4xl !text-white tabular-nums">{value}</p>
      <p className="al-eyebrow !text-white/65 mt-1.5">{label}</p>
    </div>
  )
}
