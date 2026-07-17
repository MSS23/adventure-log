'use client'

/**
 * /discover — public, unauthenticated community globe.
 *
 * Tier 1.3 feature: drops onboarding friction by letting visitors see real
 * community travel before signing up. Pulls anonymized lat/lng pins from
 * /api/public/globe-pins (no PII) and renders them on a 3D globe.
 *
 * Design language: editorial dark olive (matches landing page). Uses
 * react-globe.gl directly — no auth coupling, no shared globe state with
 * the authenticated EnhancedGlobe.
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useScroll, useTransform, useReducedMotion, MotionConfig } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { NumberCountUp } from '@/components/ui/number-count-up'
import {
  Compass,
  Sparkles,
  Users,
  MapPin,
  Globe as GlobeIcon,
  ArrowRight,
} from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'

const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
    </div>
  ),
})

interface PublicPin {
  lat: number
  lng: number
  country: string | null
  visitedAt: string | null
}

interface Stats {
  countries: number
  travelers: number
  albums: number
}

// Reasonable seed pins so the globe never feels empty even if the API errors
// or returns nothing in dev. These are major cities, not user data.
const SEED_PINS: PublicPin[] = [
  { lat: 48.8566, lng: 2.3522, country: 'FR', visitedAt: null },
  { lat: 41.9028, lng: 12.4964, country: 'IT', visitedAt: null },
  { lat: 35.6762, lng: 139.6503, country: 'JP', visitedAt: null },
  { lat: 40.7128, lng: -74.006, country: 'US', visitedAt: null },
  { lat: -33.8688, lng: 151.2093, country: 'AU', visitedAt: null },
  { lat: 51.5074, lng: -0.1278, country: 'GB', visitedAt: null },
  { lat: 1.3521, lng: 103.8198, country: 'SG', visitedAt: null },
  { lat: -22.9068, lng: -43.1729, country: 'BR', visitedAt: null },
  { lat: 25.2048, lng: 55.2708, country: 'AE', visitedAt: null },
  { lat: -1.2921, lng: 36.8219, country: 'KE', visitedAt: null },
  { lat: 52.52, lng: 13.405, country: 'DE', visitedAt: null },
  { lat: 19.4326, lng: -99.1332, country: 'MX', visitedAt: null },
]

export default function DiscoverPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [size, setSize] = useState({ w: 1200, h: 800 })
  const [pins, setPins] = useState<PublicPin[]>(SEED_PINS)
  const [stats, setStats] = useState<Stats | null>(null)
  const [pinsLoading, setPinsLoading] = useState(true)

  // Subtle parallax: foreground hero text drifts up + fades as the user
  // scrolls, while the globe background stays put. Adds depth without
  // hijacking scroll. Range tightly clipped to the first 60vh of scroll.
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -80])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.2])
  const prefersReduced = useReducedMotion()

  // Resize handling
  useEffect(() => {
    setMounted(true)
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  // Auto-rotate + initial camera
  useEffect(() => {
    if (!mounted || !globeRef.current) return
    const t = setTimeout(() => {
      if (!globeRef.current) return
      globeRef.current.pointOfView({ lat: 25, lng: 10, altitude: 2.4 }, 0)
      const controls = globeRef.current.controls()
      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.4
        controls.enableZoom = true
        controls.minDistance = 200
        controls.maxDistance = 600
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mounted])

  // Fetch real community pins. Falls back to SEED_PINS on error/empty.
  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    ;(async () => {
      try {
        const res = await apiFetch('/api/public/globe-pins', { signal: ac.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as { pins: PublicPin[]; stats: Stats }
        if (cancelled) return
        if (Array.isArray(body.pins) && body.pins.length > 0) {
          setPins(body.pins)
        }
        if (body.stats) setStats(body.stats)
      } catch (err) {
        if (cancelled) return
        log.warn(
          'Public globe pins fetch failed, using seed pins',
          { component: 'DiscoverPage', action: 'fetch-pins' },
          err as Error,
        )
      } finally {
        if (!cancelled) setPinsLoading(false)
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
    <div className="dark">
      <div className="min-h-screen bg-[#060a03] text-foreground overflow-x-hidden selection:bg-olive-500/30 selection:text-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#060a03]/85 backdrop-blur-2xl border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-olive-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <Compass className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-heading font-bold text-white tracking-tight">
                Adventure Log
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="cursor-pointer text-white/70 hover:text-white hover:bg-white/[0.06] font-medium text-sm h-9 px-4 transition-colors duration-200"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="cursor-pointer font-medium px-5 rounded-xl text-sm h-9">
                  Get started
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero with full-bleed globe */}
        <section className="relative min-h-screen flex flex-col">
          {/* Globe — absolutely positioned background */}
          <div className="absolute inset-0 z-0">
            {mounted && (
              <GlobeGL
                ref={globeRef}
                width={size.w}
                height={size.h}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="/earth-dark.jpg"
                bumpImageUrl="/earth-topology.png"
                atmosphereColor="#A8A090"
                atmosphereAltitude={0.18}
                pointsData={pins}
                pointLat="lat"
                pointLng="lng"
                pointColor={() => '#2F876E'}
                pointAltitude={0.012}
                pointRadius={0.32}
                pointsMerge={true}
                pointsTransitionDuration={500}
                showAtmosphere
              />
            )}
            {/* Top + bottom darkening so foreground text stays legible */}
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#060a03] to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#060a03] to-transparent pointer-events-none" />
          </div>

          {/* Foreground content (parallax + fade on scroll) */}
          <motion.div
            style={prefersReduced ? undefined : { y: heroY, opacity: heroOpacity }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pt-24 pb-12"
          >
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-olive-500/30 bg-olive-500/10 px-3 py-1 text-xs font-medium text-olive-300 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Community travel, live
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-3xl font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white"
            >
              See where the community has been
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-xl text-base sm:text-lg text-white/90"
            >
              Every coral pin is a real traveler&apos;s public album. Spin the
              globe, pick somewhere they went, then start building your own
              log.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3"
            >
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="coral"
                  className="group w-full sm:w-auto cursor-pointer font-semibold px-8 py-6 text-base"
                >
                  Start your travel log
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full sm:w-auto cursor-pointer text-white/80 hover:text-white hover:bg-white/[0.06] font-medium px-7 py-6 rounded-xl text-base"
                >
                  I already have one
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-4 text-xs text-white/70"
            >
              Free to start · No credit card
            </motion.p>
          </motion.div>

          {/* Stat strip pinned to bottom */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 px-5 pb-10"
          >
            <div className="mx-auto max-w-3xl grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
              <StatCell
                icon={<MapPin className="h-4 w-4" />}
                label="Pins on the globe"
                count={pins.length}
                loading={pinsLoading}
              />
              <StatCell
                icon={<GlobeIcon className="h-4 w-4" />}
                label="Countries"
                count={stats?.countries ?? countCountries(pins)}
                loading={pinsLoading}
              />
              <StatCell
                icon={<Users className="h-4 w-4" />}
                label="Travelers"
                count={stats?.travelers ?? 0}
                loading={pinsLoading}
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/75">
              Coordinates only — no usernames, photos, or trip details until
              you&apos;re a member.
            </p>
          </motion.div>
        </section>
      </div>
    </div>
    </MotionConfig>
  )
}

function StatCell({
  icon,
  label,
  count,
  loading,
}: {
  icon: React.ReactNode
  label: string
  count: number
  loading: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-5">
      <span className="text-olive-400/80">{icon}</span>
      <span className="font-heading text-2xl sm:text-3xl font-bold text-white tabular-nums">
        {loading ? (
          <span className="opacity-60">…</span>
        ) : (
          <NumberCountUp value={count} durationMs={1400} />
        )}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/70">
        {label}
      </span>
    </div>
  )
}

function countCountries(pins: PublicPin[]): number {
  return new Set(pins.map((p) => p.country).filter(Boolean) as string[]).size
}
