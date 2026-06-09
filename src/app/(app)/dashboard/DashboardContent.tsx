'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, MotionConfig } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
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
import { MotionList, MotionItem, MotionReveal } from '@/components/animations/MotionList'
import type { User } from '@/types/database'

interface RecentAlbum {
  id: string
  title: string
  cover_photo_url?: string | null
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

interface Props {
  profile: User
  userId: string
  initialStats: DashboardStats
  initialRecentAlbums: RecentAlbum[]
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2) return ''
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

export default function DashboardContent({
  profile,
  initialStats,
  initialRecentAlbums,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [stats] = useState(initialStats)
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>(initialRecentAlbums)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ids = recentAlbums.map((a) => a.id)
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
  }, [supabase, recentAlbums])

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
      <div
        className="min-h-screen"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Top bar */}
          <MotionReveal>
            <div className="flex items-start justify-between">
              <div>
                <p className="al-eyebrow mb-1">{dateLabel}</p>
                <h1 className="al-display text-4xl md:text-5xl">
                  {isFirstRun ? `Welcome, ${firstName}.` : `Welcome back, ${firstName}.`}
                </h1>
              </div>
            </div>
          </MotionReveal>

          {/* HERO — magazine-style */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.1 }}
            className="relative rounded-[22px] overflow-hidden min-h-[320px] p-8 text-white"
          >
            {/* Base gradient — brightest olive sits near the globe (top-right) and
                deepens to a near-black warm ink at the lower-left, so the headline
                and stats always sit on the darkest, highest-contrast area. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(135% 130% at 84% 6%, #6E8A33 0%, #4A5D23 32%, #2A3517 62%, #141A0C 100%)',
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

            {/* Soft warm halo behind the globe for depth */}
            <div
              className="absolute right-[-50px] top-[-80px] w-[380px] h-[380px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 42% 42%, rgba(242,161,121,0.34) 0%, rgba(199,91,58,0.16) 46%, transparent 72%)',
                filter: 'blur(10px)',
              }}
            />

            {/* Decorative globe — a little world with pins dropped across it */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.1, ease: EDITORIAL_EASE, delay: 0.25 }}
              className="absolute right-[-50px] top-[-44px] w-[300px] h-[300px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 34% 30%, rgba(242,161,121,0.55) 0%, rgba(199,91,58,0.42) 42%, rgba(20,16,10,0.32) 82%)',
                boxShadow:
                  'inset -26px -36px 72px rgba(0,0,0,0.45), inset 16px 20px 52px rgba(242,161,121,0.22), 0 0 60px rgba(199,91,58,0.16)',
                border: '1px solid rgba(247,242,231,0.10)',
              }}
            >
              {/* concentric meridian rings on the sphere */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    'repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 27px, rgba(247,242,231,0.09) 27px, rgba(247,242,231,0.09) 28px)',
                }}
              />
              {[
                { x: 42, y: 30, c: '#F2A179' },
                { x: 70, y: 45, c: '#E8C77A' },
                { x: 30, y: 60, c: '#F2A179' },
                { x: 58, y: 70, c: '#FBE3CF' },
                { x: 48, y: 48, c: '#ffffff' },
              ].map((p, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 360,
                    damping: 18,
                    delay: 0.6 + i * 0.08,
                  }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    background: p.c,
                    transform: 'translate(-50%,-50%)',
                    boxShadow: `0 0 0 3px ${p.c}44, 0 0 18px ${p.c}`,
                  }}
                />
              ))}
            </motion.div>

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
                <em className="italic font-normal" style={{ color: '#F2A179' }}>
                  written in pins.
                </em>
              </h2>
              <div className="flex gap-3 mt-5">
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Link
                    href="/globe"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-shadow hover:shadow-[0_10px_28px_rgba(226,85,58,0.65)]"
                    style={{
                      background: '#E2553A',
                      color: '#fff',
                      boxShadow: '0 6px 18px rgba(226,85,58,0.55)',
                    }}
                  >
                    <GlobeIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Spin your globe
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Link
                    href="/wrapped"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors hover:bg-white/[0.18]"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    See Wrapped
                  </Link>
                </motion.div>
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

          {/* On this day */}
          <MotionReveal delay={0.15}>
            <MemoryLaneCard />
          </MotionReveal>

          {/* Recent albums */}
          <section>
            <MotionReveal delay={0.05}>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="al-eyebrow mb-1">Recent</p>
                  <h3
                    className="font-heading text-2xl font-semibold"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    Latest adventures
                  </h3>
                </div>
                <Link
                  href="/albums"
                  className="group inline-flex items-center gap-1 text-[13px] font-semibold text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-coral)] transition-colors"
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
                className="grid grid-cols-2 md:grid-cols-3 gap-5"
                stagger={0.07}
              >
                {recentAlbums.map((album) => (
                  <MotionItem key={album.id}>
                    <Link href={`/albums/${album.id}`} className="group block">
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 will-change-transform"
                        style={{ background: 'var(--color-ivory-alt)' }}
                      >
                        {album.cover_photo_url && (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                        {album.country_code && (
                          <span className="absolute top-3 left-3 text-xl drop-shadow">
                            {flagEmoji(album.country_code)}
                          </span>
                        )}
                      </motion.div>
                      <div className="font-heading text-[15px] font-semibold text-[color:var(--color-ink)] leading-tight line-clamp-1">
                        {album.title}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[color:var(--color-muted-warm)] mt-1 line-clamp-1">
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
      className="group flex items-center gap-2.5 p-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(26,20,14,0.18)]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--color-line-warm)',
      }}
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{
          background: 'var(--color-ivory-alt)',
          color: 'var(--color-coral)',
        }}
      >
        {icon}
      </span>
      <span className="flex-1 text-[13px] font-semibold text-[color:var(--color-ink)]">
        {label}
      </span>
      <ArrowRight className="h-3 w-3 text-[color:var(--color-muted-warm)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--color-coral)]" />
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
      <section aria-labelledby="how-it-works-heading">
        <MotionReveal>
          <p className="al-eyebrow mb-1">How Adventure Log works</p>
          <h3
            id="how-it-works-heading"
            className="font-heading text-2xl font-semibold mb-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Three steps to your map of the world
          </h3>
          <p className="text-sm text-[color:var(--color-muted-warm)] mb-5 max-w-xl">
            Turn your travels into a living atlas. It starts with a single album.
          </p>
        </MotionReveal>
        <MotionList className="grid grid-cols-1 sm:grid-cols-3 gap-4" stagger={0.08}>
          {loop.map((step, i) => (
            <MotionItem key={step.title}>
              <div
                className="h-full p-5 rounded-2xl"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--color-line-warm)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                    style={{
                      background: 'var(--color-coral-tint)',
                      color: 'var(--color-coral)',
                    }}
                  >
                    {step.icon}
                  </span>
                  <span
                    className="font-mono text-[11px] tracking-[0.12em] uppercase"
                    style={{ color: 'var(--color-muted-warm)' }}
                  >
                    Step {i + 1}
                  </span>
                </div>
                <h4 className="font-heading text-[16px] font-semibold leading-tight mb-1">
                  {step.title}
                </h4>
                <p className="text-[13px] leading-relaxed text-[color:var(--color-muted-warm)]">
                  {step.body}
                </p>
              </div>
            </MotionItem>
          ))}
        </MotionList>
      </section>

      {/* Primary CTA — the one obvious next action */}
      <MotionReveal delay={0.1}>
        <div
          className="relative overflow-hidden rounded-2xl p-7 sm:p-8 text-center"
          style={{
            background: 'var(--color-coral-tint)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'var(--color-coral)', color: '#fff' }}
          >
            <MapPin className="h-5 w-5" strokeWidth={1.8} />
          </motion.div>
          <h3
            className="font-heading text-2xl font-semibold mb-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Drop your first pin
          </h3>
          <p className="text-sm text-[color:var(--color-muted-warm)] mb-5 max-w-md mx-auto">
            Your world map is empty right now. Create one album and watch it come alive.
          </p>
          <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
            <Link
              href="/albums/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-shadow hover:shadow-[0_10px_28px_rgba(226,85,58,0.45)]"
              style={{ background: 'var(--color-coral)', color: '#fff' }}
            >
              <Calendar className="h-4 w-4" strokeWidth={1.8} />
              Create your first album
            </Link>
          </motion.div>

          {/* Low-friction starting points */}
          <div className="mt-6">
            <p
              className="font-mono text-[10px] tracking-[0.12em] uppercase mb-2.5"
              style={{ color: 'var(--color-muted-warm)' }}
            >
              Not sure where to start? Try
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <Link
                  key={s}
                  href="/albums/new"
                  className="px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-colors"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--color-line-warm)',
                    color: 'var(--color-ink)',
                  }}
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
  return (
    <div
      className="p-10 rounded-2xl text-center"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--color-line-warm)',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
        style={{ background: 'var(--color-coral-tint)' }}
      >
        <MapPin
          className="h-5 w-5"
          style={{ color: 'var(--color-coral)' }}
          strokeWidth={1.8}
        />
      </motion.div>
      <h4 className="font-heading text-lg font-semibold">No albums yet</h4>
      <p className="text-sm text-[color:var(--color-muted-warm)] mt-1 mb-4">
        Your first trip starts with a single photo.
      </p>
      <Link
        href="/albums/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-shadow hover:shadow-[0_10px_28px_rgba(226,85,58,0.45)]"
        style={{ background: 'var(--color-coral)', color: '#fff' }}
      >
        <Calendar className="h-3.5 w-3.5" />
        Create your first album
      </Link>
    </div>
  )
}
