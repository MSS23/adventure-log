'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Sparkles, MapPin, Camera, Globe as GlobeIcon, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

interface WrappedAlbum {
  id: string
  title: string
  location_name: string | null
  country_code: string | null
  date_start: string | null
  cover_photo_url: string | null
  photo_count: number
}

interface WrappedSummary {
  year: number
  albumCount: number
  photoCount: number
  countryCount: number
  topAlbum: WrappedAlbum | null
  topCountries: { country_code: string; count: number }[]
  albumsByMonth: { month: string; count: number }[]
  longestTrip: { album: WrappedAlbum | null; days: number }
  firstAlbum: WrappedAlbum | null
}

function countryName(code: string): string {
  try {
    const d = new Intl.DisplayNames(['en'], { type: 'region' })
    return d.of(code.toUpperCase()) || code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🏳️'
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

export default function WrappedPage() {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [summary, setSummary] = useState<WrappedSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)

        // Pull every album + photo count for the user
        const { data: albums, error } = await supabase
          .from('albums')
          .select(
            `
            id, title, location_name, country_code, date_start, start_date,
            end_date, cover_photo_url, created_at,
            photos(count)
          `
          )
          .eq('user_id', user.id)
          .order('date_start', { ascending: false, nullsFirst: false })

        if (error || cancelled) return

        type RawRow = {
          id: string
          title: string
          location_name: string | null
          country_code: string | null
          date_start: string | null
          start_date: string | null
          end_date: string | null
          cover_photo_url: string | null
          created_at: string
          photos: Array<{ count: number }>
        }

        const all = (albums || []).map((a: RawRow): WrappedAlbum & {
          start: string | null
          end: string | null
        } => ({
          id: a.id,
          title: a.title,
          location_name: a.location_name,
          country_code: a.country_code,
          date_start: a.date_start || a.start_date || a.created_at,
          cover_photo_url: a.cover_photo_url,
          photo_count: a.photos?.[0]?.count || 0,
          start: a.date_start || a.start_date || a.created_at,
          end: a.end_date || a.date_start || a.start_date || a.created_at,
        }))

        // Available years from album dates
        const yearSet = new Set<number>()
        for (const a of all) {
          if (a.date_start) yearSet.add(new Date(a.date_start).getFullYear())
        }
        const years = [...yearSet].sort((a, b) => b - a)
        if (!cancelled) setAvailableYears(years)

        const inYear = all.filter(
          (a) => a.date_start && new Date(a.date_start).getFullYear() === year
        )

        const albumCount = inYear.length
        const photoCount = inYear.reduce((sum, a) => sum + a.photo_count, 0)

        const countryMap = new Map<string, number>()
        for (const a of inYear) {
          if (a.country_code) {
            countryMap.set(a.country_code, (countryMap.get(a.country_code) || 0) + 1)
          }
        }
        const topCountries = [...countryMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([country_code, count]) => ({ country_code, count }))

        const topAlbum =
          inYear.slice().sort((a, b) => b.photo_count - a.photo_count)[0] || null

        const firstAlbum =
          inYear
            .slice()
            .sort(
              (a, b) =>
                new Date(a.date_start || 0).getTime() - new Date(b.date_start || 0).getTime()
            )[0] || null

        // Longest trip by start-end diff
        let longest: { album: WrappedAlbum | null; days: number } = { album: null, days: 0 }
        for (const a of inYear) {
          if (!a.start || !a.end) continue
          const d = Math.max(
            1,
            Math.round(
              (new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000
            ) + 1
          )
          if (d > longest.days) longest = { album: a, days: d }
        }

        const monthCounts = new Array(12).fill(0)
        for (const a of inYear) {
          if (a.date_start) monthCounts[new Date(a.date_start).getMonth()]++
        }
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ]
        const albumsByMonth = monthNames.map((month, i) => ({ month, count: monthCounts[i] }))

        if (cancelled) return

        setSummary({
          year,
          albumCount,
          photoCount,
          countryCount: countryMap.size,
          topAlbum,
          topCountries,
          albumsByMonth,
          longestTrip: longest,
          firstAlbum,
        })
      } catch (error) {
        log.error('Wrapped load failed', { component: 'WrappedPage' }, error as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, year, supabase])

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-coral)]" />
      </div>
    )
  }

  const maxMonth = Math.max(1, ...(summary?.albumsByMonth.map((m) => m.count) || [1]))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-8">
        <p className="al-eyebrow mb-2">Annual Report</p>
        <h1 className="al-display text-4xl md:text-5xl flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-[color:var(--color-coral)]" />
          Wrapped · {year}
        </h1>
        <p className="text-sm text-[color:var(--color-muted-warm)] mt-2 max-w-xl leading-relaxed">
          A look back at your year of travel — countries, stories, and the numbers behind them.
        </p>

        {availableYears.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-full text-xs font-mono tracking-wider transition-colors ${
                  y === year
                    ? 'bg-[color:var(--color-ink)] text-[color:var(--color-ivory)]'
                    : 'bg-[color:var(--color-ivory-alt)] text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-coral-tint)]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-coral)]" />
        </div>
      ) : !summary || summary.albumCount === 0 ? (
        <div className="al-card p-12 text-center">
          <GlobeIcon className="h-10 w-10 text-[color:var(--color-muted-warm)] mx-auto mb-3" />
          <h2 className="font-heading text-xl font-semibold mb-2">
            Nothing to wrap up yet
          </h2>
          <p className="text-sm text-[color:var(--color-muted-warm)] mb-6">
            Once you log albums for {year}, this page will come alive with your year in review.
          </p>
          <Link
            href="/albums/new"
            className="inline-block al-btn-coral h-10 px-5 py-2 font-semibold text-sm"
          >
            Create your first album
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Big stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard eyebrow="Albums" value={summary.albumCount} icon={<Camera />} />
            <StatCard eyebrow="Photos" value={summary.photoCount} icon={<Camera />} />
            <StatCard eyebrow="Countries" value={summary.countryCount} icon={<GlobeIcon />} />
            <StatCard
              eyebrow="Longest Trip"
              value={summary.longestTrip.days}
              suffix={summary.longestTrip.days === 1 ? ' day' : ' days'}
              icon={<Calendar />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top countries */}
            <div className="al-card p-5 md:col-span-2">
              <p className="al-eyebrow mb-3">Where you went</p>
              <div className="space-y-2">
                {summary.topCountries.length === 0 ? (
                  <p className="text-sm text-[color:var(--color-muted-warm)]">
                    No country data yet — add country codes to your albums.
                  </p>
                ) : (
                  summary.topCountries.map((c) => {
                    const pct = Math.round((c.count / summary.albumCount) * 100)
                    return (
                      <div key={c.country_code} className="flex items-center gap-3">
                        <span className="text-xl w-8">{flagEmoji(c.country_code)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[color:var(--color-ink)]">
                              {countryName(c.country_code)}
                            </span>
                            <span className="font-mono text-[11px] text-[color:var(--color-muted-warm)]">
                              {c.count} {c.count === 1 ? 'album' : 'albums'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[color:var(--color-ivory-alt)] overflow-hidden">
                            <div
                              className="h-full bg-[color:var(--color-coral)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Top album */}
            {summary.topAlbum && (
              <Link
                href={`/albums/${summary.topAlbum.id}`}
                className="al-card overflow-hidden group"
              >
                <div className="relative aspect-[4/3] bg-[color:var(--color-ivory-alt)]">
                  {summary.topAlbum.cover_photo_url && (
                    <Image
                      src={getPhotoUrl(summary.topAlbum.cover_photo_url) || ''}
                      alt={summary.topAlbum.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 al-badge !bg-white !text-[color:var(--color-ink)]">
                    Top story
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-heading text-lg font-semibold text-[color:var(--color-ink)] line-clamp-1">
                    {summary.topAlbum.title}
                  </div>
                  {summary.topAlbum.location_name && (
                    <div className="text-xs text-[color:var(--color-muted-warm)] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {summary.topAlbum.location_name}
                    </div>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-muted-warm)] mt-2">
                    {summary.topAlbum.photo_count} photos
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Monthly cadence */}
          <div className="al-card p-5">
            <p className="al-eyebrow mb-4">Your year, month by month</p>
            <div className="flex items-end gap-2 h-32">
              {summary.albumsByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-md bg-[color:var(--color-coral)] transition-all"
                      style={{
                        height: `${(m.count / maxMonth) * 100}%`,
                        minHeight: m.count > 0 ? '4px' : '0',
                        opacity: m.count === 0 ? 0.15 : 1,
                      }}
                      title={`${m.count} ${m.count === 1 ? 'album' : 'albums'}`}
                    />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-muted-warm)]">
                    {m.month}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.firstAlbum && (
              <MilestoneCard
                eyebrow="Kicked off with"
                title={summary.firstAlbum.title}
                subtitle={summary.firstAlbum.location_name || ''}
                href={`/albums/${summary.firstAlbum.id}`}
              />
            )}
            {summary.longestTrip.album && (
              <MilestoneCard
                eyebrow={`${summary.longestTrip.days} days — your longest trip`}
                title={summary.longestTrip.album.title}
                subtitle={summary.longestTrip.album.location_name || ''}
                href={`/albums/${summary.longestTrip.album.id}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  eyebrow,
  value,
  suffix = '',
  icon,
}: {
  eyebrow: string
  value: number
  suffix?: string
  icon: React.ReactNode
}) {
  return (
    <div className="al-card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="al-eyebrow">{eyebrow}</p>
        <div className="w-6 h-6 text-[color:var(--color-muted-warm)]">{icon}</div>
      </div>
      <div className="al-stat-value text-4xl">
        {value.toLocaleString()}
        <span className="text-sm font-normal font-sans text-[color:var(--color-muted-warm)] ml-1">
          {suffix}
        </span>
      </div>
    </div>
  )
}

function MilestoneCard({
  eyebrow,
  title,
  subtitle,
  href,
}: {
  eyebrow: string
  title: string
  subtitle: string
  href: string
}) {
  return (
    <Link href={href} className="al-card p-5 block hover:shadow-[0_4px_8px_rgba(26,20,14,0.06),0_16px_40px_rgba(26,20,14,0.10)] transition-shadow">
      <p className="al-eyebrow mb-2">{eyebrow}</p>
      <div className="font-heading text-xl font-semibold text-[color:var(--color-ink)] line-clamp-1">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-[color:var(--color-muted-warm)] flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3" />
          {subtitle}
        </div>
      )}
    </Link>
  )
}
