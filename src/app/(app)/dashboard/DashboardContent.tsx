'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Map as MapIcon,
} from 'lucide-react'
import { MemoryLaneCard } from '@/components/memories/MemoryLaneCard'
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
  userId,
  initialStats,
  initialRecentAlbums,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [stats] = useState(initialStats)
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>(initialRecentAlbums)

  // Enrich recent albums with photo counts (nice-to-have)
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
          prev.map((a) => ({ ...a, photo_count: counts.get(a.id) || 0 }))
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

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div>
            <p className="al-eyebrow mb-1">{dateLabel}</p>
            <h1 className="al-display text-4xl md:text-5xl">
              Welcome back, {firstName}.
            </h1>
          </div>
        </div>

        {/* HERO — magazine-style */}
        <section className="relative rounded-[22px] overflow-hidden min-h-[320px] p-8 text-white">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, #17130D 0%, #3D2416 35%, #A2322B 80%, #E2553A 100%)',
            }}
          />

          {/* Decorative pins */}
          <div
            className="absolute right-[-60px] top-[-40px] w-[320px] h-[320px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, rgba(242,161,121,0.6) 0%, rgba(226,85,58,0.5) 40%, rgba(26,19,13,0.2) 80%)',
              boxShadow: 'inset -30px -40px 80px rgba(0,0,0,0.4)',
            }}
          >
            {[
              { x: 42, y: 30, c: '#E2553A' },
              { x: 70, y: 45, c: '#C99B3B' },
              { x: 30, y: 60, c: '#E2553A' },
              { x: 58, y: 70, c: '#F2A179' },
              { x: 48, y: 48, c: '#ffffff' },
            ].map((p, i) => (
              <span
                key={i}
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
          </div>

          <div className="relative z-10 flex flex-col h-full min-h-[260px]">
            <span className="al-badge !bg-white/15 !text-white !border-white/20 backdrop-blur">
              Your atlas
            </span>
            <div className="flex-1" />
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
              {stats.countries} countries · {stats.cities} cities · {stats.albums} albums
            </div>
            <h2
              className="font-heading text-[40px] md:text-[52px] font-semibold mt-2 leading-[0.98]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Your world,
              <br />
              <em className="italic font-normal" style={{ color: '#F2A179' }}>
                written in pins.
              </em>
            </h2>
            <div className="flex gap-3 mt-5">
              <Link
                href="/globe"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold"
                style={{
                  background: '#E2553A',
                  color: '#fff',
                  boxShadow: '0 6px 18px rgba(226,85,58,0.55)',
                }}
              >
                <GlobeIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                Spin your globe
              </Link>
              <Link
                href="/wrapped"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                See Wrapped
              </Link>
            </div>
          </div>
        </section>

        {/* Quick access tile row — the "shortcuts without clutter" pattern.
            These live inside Home so they don't need to be in the sidebar,
            but they're still one click away. */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickTile href="/albums" icon={<ImageIcon className="h-4 w-4" />} label="Albums" />
          <QuickTile href="/passport" icon={<Book className="h-4 w-4" />} label="Passport" />
          <QuickTile href="/wrapped" icon={<Sparkles className="h-4 w-4" />} label="Wrapped" />
          <QuickTile href="/wishlist" icon={<Star className="h-4 w-4" />} label="Wishlist" />
        </section>

        {/* On this day */}
        <MemoryLaneCard />

        {/* Recent albums */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="al-eyebrow mb-1">Recent</p>
              <h3 className="font-heading text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
                Latest adventures
              </h3>
            </div>
            <Link
              href="/albums"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-coral)] transition-colors"
            >
              All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentAlbums.length === 0 ? (
            <EmptyAlbums />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {recentAlbums.map((album) => (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group block"
                >
                  <div
                    className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3"
                    style={{ background: 'var(--color-ivory-alt)' }}
                  >
                    {album.cover_photo_url && (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    {album.country_code && (
                      <span className="absolute top-3 left-3 text-xl drop-shadow">
                        {flagEmoji(album.country_code)}
                      </span>
                    )}
                  </div>
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
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="al-stat-value text-[32px]"
        style={{ color: accent ? 'var(--color-coral)' : 'var(--color-ink)' }}
      >
        {value.toLocaleString()}
      </div>
      <div className="al-eyebrow">{label}</div>
    </div>
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
      className="group flex items-center gap-2.5 p-3 rounded-xl transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--color-line-warm)',
      }}
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
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
      <ArrowRight className="h-3 w-3 text-[color:var(--color-muted-warm)] group-hover:text-[color:var(--color-coral)] transition-colors" />
    </Link>
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
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
        style={{ background: 'var(--color-coral-tint)' }}
      >
        <MapPin
          className="h-5 w-5"
          style={{ color: 'var(--color-coral)' }}
          strokeWidth={1.8}
        />
      </div>
      <h4 className="font-heading text-lg font-semibold">No albums yet</h4>
      <p className="text-sm text-[color:var(--color-muted-warm)] mt-1 mb-4">
        Your first trip starts with a single photo.
      </p>
      <Link
        href="/albums/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold"
        style={{ background: 'var(--color-coral)', color: '#fff' }}
      >
        <Calendar className="h-3.5 w-3.5" />
        Create your first album
      </Link>
    </div>
  )
}
