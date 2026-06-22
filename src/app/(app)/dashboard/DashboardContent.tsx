'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, MotionConfig } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import {
  MapPin,
  ArrowRight,
  Calendar,
  Globe as GlobeIcon,
  Sparkles,
  Book,
  Star,
  Image as ImageIcon,
  Camera,
  Share2,
} from 'lucide-react'
import { MemoryLaneCard } from '@/components/memories/MemoryLaneCard'
import { CollaborationInvites } from '@/components/albums/CollaborationInvites'
import { MotionList, MotionItem, MotionReveal } from '@/components/animations/MotionList'
import { Button } from '@/components/ui/button'
import { MotionCard } from '@/components/ui/card'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import DashboardLoading from './loading'
import type { User } from '@/types/database'

interface RecentAlbum {
  id: string
  title: string
  cover_photo_url?: string | null
  cover_photo_x_offset?: number | null
  cover_photo_y_offset?: number | null
  location_name?: string | null
  country_code?: string | null
  date_start?: string | null
  created_at: string
  status?: string
  photo_count?: number
}

interface DashboardStats {
  albums: number
  photos: number
  countries: number
  cities: number
}

interface DashboardData {
  profile: User | null
  stats: DashboardStats
  recentAlbums: RecentAlbum[]
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

// Ghost button styled for the dark hero (translucent white on the gradient).
const HERO_GHOST_BTN =
  'bg-white/[0.12] text-white border border-white/20 shadow-none hover:bg-white/[0.18] hover:text-white active:scale-[0.97] focus-visible:ring-offset-transparent'

function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2) return ''
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

export default function DashboardContent() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const userId = user?.id

  const { data, isPending } = useQuery<DashboardData>({
    queryKey: ['dashboard', userId],
    enabled: !!userId,
    queryFn: async () => {
      // Fetch profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId!)
        .single()

      // Fetch stats and recent albums in parallel
      const [albumsResult, photosResult, recentAlbumsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_code, location_name, latitude, longitude, status')
          .eq('user_id', userId!),
        supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
        supabase
          .from('albums')
          .select('id, title, cover_photo_url, cover_photo_x_offset, cover_photo_y_offset, location_name, country_code, date_start, created_at, status')
          .eq('user_id', userId!)
          .order('date_start', { ascending: false, nullsFirst: false })
          .limit(6),
      ])

      const albums = (albumsResult.data || []).filter((a) => a.status !== 'draft')
      const albumsWithLocation = albums.filter((a) => a.latitude && a.longitude)

      const uniqueCountries = new Set(
        albumsWithLocation
          .filter((a) => a.country_code || a.location_name)
          .map((a) => {
            if (a.country_code) return a.country_code
            if (a.location_name) {
              const parts = a.location_name.split(',').map((p: string) => p.trim())
              return parts[parts.length - 1] || ''
            }
            return ''
          })
          .filter((country) => country.length > 0),
      )

      const uniqueCities = new Set(
        albumsWithLocation
          .filter((a) => a.location_name)
          .map((a) => {
            const parts = a.location_name.split(',').map((p: string) => p.trim())
            return parts[0] || a.location_name
          }),
      )

      const stats: DashboardStats = {
        albums: albums.length,
        photos: photosResult.count || 0,
        countries: uniqueCountries.size,
        cities: uniqueCities.size,
      }

      const recentAlbums = ((recentAlbumsResult.data || []) as RecentAlbum[]).filter(
        (a) => a.status !== 'draft',
      )

      return { profile: profile ?? null, stats, recentAlbums }
    },
  })

  const profile = data?.profile ?? null
  const stats = data?.stats
  const initialRecentAlbums = useMemo(() => data?.recentAlbums ?? [], [data?.recentAlbums])
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([])

  // Keep local enrichable copy in sync with the fetched recent albums.
  useEffect(() => {
    setRecentAlbums(initialRecentAlbums)
  }, [initialRecentAlbums])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ids = initialRecentAlbums.map((a) => a.id)
        if (ids.length === 0) return
        const { data } = await supabase
          .from('photos')
          .select('album_id')
          .in('album_id', ids)
        if (cancelled || !data) return
        const counts = new Map<string, number>()
        for (const row of data as { album_id: string }[]) {
          counts.set(row.album_id, (counts.get(row.album_id) || 0) + 1)
        }
        setRecentAlbums((prev) =>
          prev.map((a) => ({ ...a, photo_count: counts.get(a.id) || 0 })),
        )
      } catch (error) {
        log.error('Enrichment failed', { component: 'Dashboard' }, error as Error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, initialRecentAlbums])

  // Loading: no user yet, or the dashboard query is still resolving.
  if (!userId || isPending || !stats) {
    return <DashboardLoading />
  }

  // Profile not found → guide the user to complete setup.
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-heading text-base md:text-lg font-semibold text-foreground">Profile not found</p>
          <p className="mt-1 text-sm text-muted-foreground">Please complete your profile setup</p>
          <Link href="/setup" className="mt-5 inline-block cursor-pointer">
            <Button className="cursor-pointer">Complete Profile Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  const firstName =
    (profile.display_name || profile.username || 'Explorer').split(' ')[0] || 'Explorer'
  const today = new Date()
  const dateLabel = today
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .replace(',', ' ·')

  // First-run: a brand-new account with nothing logged yet. We keep the
  // approved hero but swap the body for a focused, single-CTA onboarding so
  // the page never reads as a half-empty dashboard full of dead links.
  const isFirstRun = stats.albums === 0

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
          {/* Top bar */}
          <MotionReveal>
            <header className="space-y-1">
              <p className="al-eyebrow">{dateLabel}</p>
              <h1 className="al-display text-4xl md:text-5xl">
                {isFirstRun ? `Welcome, ${firstName}.` : `Welcome back, ${firstName}.`}
              </h1>
            </header>
          </MotionReveal>

          {/* HERO — magazine-style */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden min-h-[320px] p-8 text-white"
          >
            {/* Base gradient — brightest olive sits near the globe (top-right) and
                deepens to a near-black warm ink at the lower-left, so the headline
                and stats always sit on the darkest, highest-contrast area. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(135% 130% at 84% 6%, #10B981 0%, #059669 32%, #134E4A 62%, #0C1014 100%)',
              }}
            />

            {/* Cartographic grid — faint meridians & parallels evoke an atlas page,
                masked so it fades out over the text and never hurts legibility. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(247,242,231,0.07) 0px, rgba(247,242,231,0.07) 1px, transparent 1px, transparent 46px), repeating-linear-gradient(90deg, rgba(247,242,231,0.07) 0px, rgba(247,242,231,0.07) 1px, transparent 1px, transparent 46px)',
                maskImage:
                  'radial-gradient(120% 120% at 82% 8%, #000 0%, rgba(0,0,0,0.45) 58%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(120% 120% at 82% 8%, #000 0%, rgba(0,0,0,0.45) 58%, transparent 100%)',
              }}
            />

            {/* Decorative globe — a recognizable little world with dropped pins.
                Replaces the old abstract blob: a graticule sphere reads clearly
                as a globe and folds the glow/rings into one tidy layer. */}
            <HeroGlobe />

            {/* Contrast scrim — anchors the headline & stats over any texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top right, rgba(8,7,4,0.58) 0%, rgba(8,7,4,0.18) 44%, transparent 68%)',
              }}
            />

            <div className="relative z-10 flex flex-col h-full min-h-[260px]">
              <span className="al-badge !bg-white/20 !text-white !border-white/30 backdrop-blur-md">
                <GlobeIcon className="h-3 w-3" strokeWidth={2} />
                Your atlas
              </span>
              <div className="flex-1" />
              <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/90">
                {stats.countries} countries · {stats.cities} cities · {stats.albums} albums
              </div>
              <h2
                className="font-heading text-[40px] md:text-[52px] font-semibold mt-2 leading-[0.98]"
                style={{ letterSpacing: '-0.02em', textShadow: '0 2px 28px rgba(0,0,0,0.30)' }}
              >
                Your world,
                <br />
                <em className="italic font-normal" style={{ color: '#6EE7B7' }}>
                  written in pins.
                </em>
              </h2>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button variant="coral" size="pill" asChild>
                  <Link href="/globe">
                    <GlobeIcon className="h-4 w-4" strokeWidth={1.8} />
                    Spin your globe
                  </Link>
                </Button>
                <Button size="pill" asChild className={HERO_GHOST_BTN}>
                  <Link href="/wrapped">See Wrapped</Link>
                </Button>
              </div>
            </div>
          </motion.section>

          {isFirstRun ? (
            <FirstRunGuide />
          ) : (
            <>
          {/* Quick access tile row */}
          <section aria-labelledby="quick-access-heading">
            <MotionReveal>
              <p id="quick-access-heading" className="al-eyebrow mb-3">
                Jump back in
              </p>
            </MotionReveal>
            <MotionList className="grid grid-cols-2 md:grid-cols-4 gap-3" stagger={0.06}>
              <MotionItem>
                <QuickTile href="/albums" icon={<ImageIcon className="h-4 w-4" />} label="Albums" />
              </MotionItem>
              <MotionItem>
                <QuickTile href="/passport" icon={<Book className="h-4 w-4" />} label="Passport" />
              </MotionItem>
              <MotionItem>
                <QuickTile href="/wrapped" icon={<Sparkles className="h-4 w-4" />} label="Wrapped" />
              </MotionItem>
              <MotionItem>
                <QuickTile href="/wishlist" icon={<Star className="h-4 w-4" />} label="Wishlist" />
              </MotionItem>
            </MotionList>
          </section>

          {/* Pending album collaboration invites (self-hides when none) */}
          <CollaborationInvites />

          {/* On this day */}
          <MotionReveal delay={0.15}>
            <MemoryLaneCard />
          </MotionReveal>

          {/* Recent albums */}
          <section className="space-y-4">
            <MotionReveal delay={0.05}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="al-eyebrow mb-0.5">Recent</p>
                  <h3 className="al-display text-xl md:text-2xl">Latest adventures</h3>
                </div>
                <Link
                  href="/albums"
                  className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  All
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </MotionReveal>

            {recentAlbums.length === 0 ? (
              <MotionReveal>
                <EmptyAlbums />
              </MotionReveal>
            ) : (
              <MotionList
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                stagger={0.06}
              >
                {recentAlbums.map((album) => (
                  <MotionItem key={album.id}>
                    <Link
                      href={`/albums/${album.id}`}
                      aria-label={`Open album ${album.title}`}
                      className="group block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted mb-3 shadow-[var(--shadow-resting)] transition-shadow duration-200 group-hover:shadow-[var(--shadow-hover)] will-change-transform"
                      >
                        {album.cover_photo_url && (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            style={{ objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%` }}
                          />
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                        />
                        {album.country_code && (
                          <span className="absolute top-3 left-3 text-xl drop-shadow">
                            {flagEmoji(album.country_code)}
                          </span>
                        )}
                      </motion.div>
                      <div className="font-heading text-base font-semibold text-foreground leading-tight line-clamp-1">
                        {album.title}
                      </div>
                      <div className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground line-clamp-1">
                        {(album.location_name || 'Unknown').split(',')[0]}
                        {album.date_start &&
                          ` · ${new Date(album.date_start).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}`}
                        {album.photo_count ? ` · ${album.photo_count} photos` : ''}
                      </div>
                    </Link>
                  </MotionItem>
                ))}
              </MotionList>
            )}
          </section>
            </>
          )}
        </div>
      </div>
    </MotionConfig>
  )
}

// A crisp, recognizable globe rendered as SVG — latitude/longitude graticule
// over a warm sphere, with a few location pins dropped on the visible face.
// One self-contained layer (glow + sphere + lines + pins) instead of the old
// stack of overlapping gradients, so the hero reads as "a world" at a glance.
function HeroGlobe() {
  const pins = [
    { x: 74, y: 66, c: '#6EE7B7', d: 0 },
    { x: 122, y: 86, c: '#E8C77A', d: 0.1 },
    { x: 92, y: 116, c: '#FBE3CF', d: 0.2 },
    { x: 138, y: 58, c: '#ffffff', d: 0.3 },
  ]

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1, ease: EDITORIAL_EASE, delay: 0.2 }}
      className="pointer-events-none absolute right-[-56px] top-[-58px] h-[320px] w-[320px] sm:right-[-36px] sm:h-[360px] sm:w-[360px]"
    >
      <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="al-globe-face" cx="36%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#F6B58C" />
            <stop offset="40%" stopColor="#D06B43" />
            <stop offset="78%" stopColor="#7A3320" />
            <stop offset="100%" stopColor="#241008" />
          </radialGradient>
          <radialGradient id="al-globe-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(242,161,121,0.42)" />
            <stop offset="55%" stopColor="rgba(16,185,129,0.14)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </radialGradient>
          <clipPath id="al-globe-clip">
            <circle cx="100" cy="100" r="84" />
          </clipPath>
        </defs>

        {/* atmospheric glow */}
        <circle cx="100" cy="100" r="118" fill="url(#al-globe-glow)" />

        {/* sphere body */}
        <circle cx="100" cy="100" r="84" fill="url(#al-globe-face)" />

        {/* graticule: meridians (longitude) as vertical ellipses, parallels
            (latitude) as horizontal rings — the curved rings read as a real
            3D sphere rather than a flat wireframe ball. */}
        <g
          clipPath="url(#al-globe-clip)"
          fill="none"
          stroke="#F7F2E7"
          strokeOpacity="0.15"
          strokeWidth="1"
        >
          <ellipse cx="100" cy="100" rx="84" ry="84" />
          <ellipse cx="100" cy="100" rx="55" ry="84" />
          <ellipse cx="100" cy="100" rx="27" ry="84" />
          <line x1="100" y1="16" x2="100" y2="184" />
          <ellipse cx="100" cy="100" rx="84" ry="14" strokeOpacity="0.24" />
          <ellipse cx="100" cy="72" rx="79" ry="11" />
          <ellipse cx="100" cy="128" rx="79" ry="11" />
          <ellipse cx="100" cy="46" rx="64" ry="8" />
          <ellipse cx="100" cy="154" rx="64" ry="8" />
        </g>

        {/* rim light */}
        <circle
          cx="100"
          cy="100"
          r="84"
          fill="none"
          stroke="#F7F2E7"
          strokeOpacity="0.22"
          strokeWidth="1.2"
        />

        {/* location pins dropped on the visible face */}
        {pins.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.6 + p.d }}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            <circle cx={p.x} cy={p.y} r="6.5" fill={p.c} opacity="0.22" />
            <circle cx={p.x} cy={p.y} r="3" fill={p.c} />
          </motion.g>
        ))}
      </svg>
    </motion.div>
  )
}

function QuickTile({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-resting)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-foreground">
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}

// Brand-new account: explain the core loop in one glance, give one obvious
// primary action, and offer a few low-friction starting points.
function FirstRunGuide() {
  const loop = [
    {
      icon: <Camera className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Log a trip',
      body: 'Add photos, a place, and a date. That’s an album.',
    },
    {
      icon: <GlobeIcon className="h-5 w-5" strokeWidth={1.8} />,
      title: 'See it on your globe',
      body: 'Every album drops a pin on your own 3D world.',
    },
    {
      icon: <Share2 className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Share the journey',
      body: 'Build a passport, get your year Wrapped, share it.',
    },
  ]

  const starters = [
    'A weekend city break',
    'Your last big trip',
    'The place you call home',
  ]

  return (
    <div className="space-y-8">
      {/* Core-loop explainer */}
      <section aria-labelledby="how-it-works-heading" className="space-y-4">
        <MotionReveal>
          <p className="al-eyebrow mb-0.5">How Adventure Log works</p>
          <h3 id="how-it-works-heading" className="al-display text-xl md:text-2xl">
            Three steps to your map of the world
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Turn your travels into a living atlas. It starts with a single album.
          </p>
        </MotionReveal>
        <MotionList className="grid grid-cols-1 sm:grid-cols-3 gap-4" stagger={0.06}>
          {loop.map((step, i) => (
            <MotionItem key={step.title}>
              <MotionCard flat className="h-full gap-0 py-0 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {step.icon}
                  </span>
                  <span className="al-eyebrow">Step {i + 1}</span>
                </div>
                <h4 className="font-heading text-base font-semibold leading-tight text-foreground mb-1">
                  {step.title}
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </MotionCard>
            </MotionItem>
          ))}
        </MotionList>
      </section>

      {/* Primary CTA — the one obvious next action */}
      <MotionReveal delay={0.1}>
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-resting)] sm:p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent"
          >
            <MapPin className="h-6 w-6" strokeWidth={1.8} />
          </motion.div>
          <h3 className="al-display text-xl md:text-2xl">Drop your first pin</h3>
          <p className="mx-auto mt-1 mb-5 max-w-md text-sm text-muted-foreground">
            Your world map is empty right now. Create one album and watch it come alive.
          </p>
          <Button variant="coral" asChild>
            <Link href="/albums/new">
              <Calendar className="h-4 w-4" strokeWidth={1.8} />
              Create your first album
            </Link>
          </Button>

          {/* Low-friction starting points */}
          <div className="mt-6">
            <p className="al-eyebrow mb-2.5">Not sure where to start? Try</p>
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <Link
                  key={s}
                  href="/albums/new"
                  className="cursor-pointer rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </MotionReveal>
    </div>
  )
}

function EmptyAlbums() {
  const router = useRouter()
  return (
    <EnhancedEmptyState
      icon={<MapPin className="h-6 w-6" strokeWidth={1.8} />}
      title="No albums yet"
      description="Your first trip starts with a single photo."
      action={{
        label: 'Create your first album',
        onClick: () => router.push('/albums/new'),
      }}
    />
  )
}
