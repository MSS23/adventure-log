'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Globe, MapPin, Camera, Route, Share2, Loader2, Compass, Plane,
  Copy, Check, ScanLine,
} from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { StreakBadge } from '@/components/profile/StreakBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { PassportWorldMap } from '@/components/passport/PassportWorldMap'
import { getCountryName } from '@/lib/utils/country'
import { parseLocalDate } from '@/lib/utils/travel-date'
import { CONTINENT_EMOJI, type Continent } from '@/lib/utils/continents'
import { useTravelPassport } from '@/lib/hooks/useTravelPassport'

// Camera + QR-decode stack loads only when the user actually opens the
// scanner — it's dead weight for a passport page view otherwise.
const PassportScanner = dynamic(
  () => import('@/components/passport/PassportScanner').then(m => ({ default: m.PassportScanner })),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// Journey narrative statements — generates 2–5 storytelling lines from data
// ---------------------------------------------------------------------------
function buildJourneyStatements(d: {
  albums: { id: string; title: string; location_name: string | null; country_code: string | null; date_start: string | null; latitude: number; longitude: number }[]
  countryCodes: string[]
  cityCount: number
  totalDistanceKm: number
  photoCount: number
  continentProgress: { name: string; visited: number; total: number }[]
  firstTrip: { date: string; location: string } | null
  latestTrip: { date: string; location: string } | null
}): string[] {
  const out: string[] = []
  const countryCount = d.countryCodes.length

  // 1. Time span
  if (d.firstTrip && d.latestTrip && d.firstTrip.date !== d.latestTrip.date) {
    const years =
      (parseLocalDate(d.latestTrip.date)?.getFullYear() ?? 0) -
      (parseLocalDate(d.firstTrip.date)?.getFullYear() ?? 0)
    if (years >= 1) {
      out.push(
        `Across ${years} ${years === 1 ? 'year' : 'years'} of travel — from ${d.firstTrip.location} to ${d.latestTrip.location}.`
      )
    } else {
      out.push(`Your travel story begins in ${d.firstTrip.location}.`)
    }
  } else if (d.firstTrip) {
    out.push(`Your travel story begins in ${d.firstTrip.location}.`)
  }

  // 2. Scale (countries / cities)
  if (countryCount >= 1) {
    if (countryCount === 1) {
      out.push(`One country, ${d.cityCount} ${d.cityCount === 1 ? 'city' : 'cities'} — and counting.`)
    } else if (countryCount < 5) {
      out.push(`${countryCount} countries, ${d.cityCount} cities logged.`)
    } else if (countryCount < 20) {
      out.push(
        `${countryCount} countries mapped, ${d.cityCount} cities explored — every pin a story.`
      )
    } else {
      out.push(
        `${countryCount} countries — roughly ${Math.round((countryCount / 195) * 100)}% of the world.`
      )
    }
  }

  // 3. Continents
  const continentsVisited = d.continentProgress.filter((c) => c.visited > 0).length
  if (continentsVisited >= 2) {
    const totalContinents = d.continentProgress.length || 7
    if (continentsVisited === totalContinents) {
      out.push('Every inhabited continent, visited — a rare kind of traveler.')
    } else if (continentsVisited >= 5) {
      out.push(
        `${continentsVisited} of 7 continents crossed off. ${totalContinents - continentsVisited} to go.`
      )
    } else {
      out.push(
        `${continentsVisited} continents under your belt — the world is still wider than your atlas.`
      )
    }
  }

  // 4. Distance — only if meaningful
  if (d.totalDistanceKm > 0) {
    if (d.totalDistanceKm >= 40075) {
      const laps = (d.totalDistanceKm / 40075).toFixed(1)
      out.push(`${d.totalDistanceKm.toLocaleString()} km logged — that's the Earth, around, ${laps} times.`)
    } else if (d.totalDistanceKm >= 10000) {
      out.push(
        `${d.totalDistanceKm.toLocaleString()} km travelled — longer than a flight across a continent.`
      )
    } else if (d.totalDistanceKm >= 1000) {
      out.push(`${d.totalDistanceKm.toLocaleString()} km on the move so far.`)
    }
  }

  // 5. Photos — if substantial
  if (d.photoCount >= 200) {
    out.push(
      `${d.photoCount.toLocaleString()} photos captured — a quiet archive of places, people, and hours.`
    )
  }

  // 6. Most recent country
  if (d.latestTrip) {
    const monthsAgo = Math.floor(
      (Date.now() - (parseLocalDate(d.latestTrip.date)?.getTime() ?? Date.now())) /
        (1000 * 60 * 60 * 24 * 30)
    )
    if (monthsAgo === 0) {
      out.push(`Most recent stamp: ${d.latestTrip.location} — still fresh in the camera roll.`)
    } else if (monthsAgo <= 3) {
      out.push(`Last seen in ${d.latestTrip.location}, ${monthsAgo} ${monthsAgo === 1 ? 'month' : 'months'} ago.`)
    }
  }

  return out.slice(0, 5)
}

// ---------------------------------------------------------------------------
// QR Code component — premium passport style
// ---------------------------------------------------------------------------
function PassportQRCode({ url, size = 180 }: { url: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    // qrcode is lazy-loaded: QR generation only happens on this page, so the
    // library shouldn't ride in the shared vendor bundle on every route.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          width: size * 2,
          margin: 2,
          color: { dark: '#2d3a1a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      )
      .then(setQrDataUrl)
      .catch(() => {})
  }, [url, size])

  if (!qrDataUrl) return <div style={{ width: size, height: size }} className="bg-muted rounded-xl animate-pulse" />

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden bg-card p-3 border border-border">
        <Image src={qrDataUrl} alt="QR Code" width={size} height={size} className="block rounded-xl" />
      </div>
      <div className="absolute -bottom-2 -right-2 size-9 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
        <Compass className="size-4 text-primary-foreground" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Globe Coverage Ring
// ---------------------------------------------------------------------------
function GlobeCoverageRing({ percentage, countriesCount }: { percentage: number; countriesCount: number }) {
  const radius = 62
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="172" height="172" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="5" stroke="var(--muted)" />
        <circle
          cx="70" cy="70" r={radius} fill="none" strokeWidth="7"
          stroke="var(--color-coral)" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="al-stat-value text-3xl tabular-nums">{percentage.toFixed(1)}%</span>
        <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
          {countriesCount} / 195
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TravelPassportPage() {
  const { profile } = useAuth()
  const { data, loading } = useTravelPassport()
  const [copied, setCopied] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)

  // Best-effort mint of a short-lived signed connect token for the on-screen
  // QR ONLY. It proves to /api/passport/connect that the scanner physically
  // scanned THIS owner's QR, which authorizes the instant mutual connect even
  // for private/friends accounts. On any failure we quietly fall back to the
  // tokenless URL (private/friends scans then downgrade to a follow request).
  // Re-mint every 10 minutes so a QR sheet left open past the 15-minute token
  // TTL (e.g. at a meetup) keeps authorizing instant connects.
  useEffect(() => {
    if (!profile?.username) return
    let cancelled = false
    const mint = () => {
      apiFetch('/api/passport/qr-token')
        .then(async (res) => (res.ok ? res.json() : null))
        .then((data: { token?: string } | null) => {
          if (!cancelled && typeof data?.token === 'string') setQrToken(data.token)
        })
        .catch(() => { /* tokenless QR still works, just without the fast path */ })
    }
    mint()
    const interval = setInterval(mint, 10 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [profile?.username])

  // Share links must resolve to /u/[username] — the public passport looks the
  // user up by username, and the QR scanner's validator rejects anything that
  // isn't a bare username (a UUID fallback would fail both). So only build a
  // share URL when the account actually has a username.
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !profile?.username) return ''
    // getWebOrigin(): on native, window.location.origin is capacitor://localhost
    // — a QR/share link encoding that would be unopenable on other devices.
    // withRef: the scanner only validates the pathname (and re-forces
    // connect=true itself), so the extra ref param is QR-safe, and anyone who
    // follows the link in a browser and signs up auto-follows the owner.
    return withRef(
      `${getWebOrigin()}/u/${profile.username}/passport?connect=true`,
      profile.username
    )
  }, [profile?.username])

  // QR-ONLY variant of the share URL, carrying the short-lived signed token.
  // Copy-link and the share sheet keep the tokenless shareUrl — those links
  // are long-lived and must not embed a 15-minute credential.
  const qrUrl = useMemo(() => {
    if (!shareUrl) return ''
    return qrToken ? `${shareUrl}&t=${qrToken}` : shareUrl
  }, [shareUrl, qrToken])

  const handleShare = useCallback(async () => {
    trackGrowthEvent('share_link_created', { meta: { surface: 'passport_qr' } })
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || profile?.username || 'My'} Travel Passport`,
          text: 'Check out my Travel Passport on Adventure Log!',
          url: shareUrl,
        })
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl, profile])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl)
    trackGrowthEvent('share_link_created', { meta: { surface: 'passport_qr' } })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading passport...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Unable to load passport data.</p>
      </div>
    )
  }

  const globePct = (data.countryCodes.length / 195) * 100
  const displayName = profile?.display_name || profile?.username || 'Traveler'
  const avatarUrl = getPhotoUrl(profile?.avatar_url, 'avatars') || undefined
  const username = profile?.username || ''

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 sm:pt-8">
      {/* Editorial header — shared Back + Home navigation */}
      <PageHeader title="Passport" className="mb-6" />

      {/* ── Leather passport book ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-6"
        style={{
          background: '#46301E',
          color: '#E8D4A8',
          border: '1px solid rgba(232,212,168,0.14)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.12,
          }}
        />
        <div className="relative">
          <div className="font-mono text-[9px] tracking-[0.22em] opacity-60">
            ADVENTURE LOG · PASSEPORT
          </div>

          <div className="flex items-center gap-4 mt-3">
            <Avatar className="size-14 flex-shrink-0" style={{ border: '2px solid rgba(232,212,168,0.25)' }}>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback
                style={{ background: '#1A1411', color: '#E8D4A8' }}
                className="font-heading text-base font-semibold"
              >
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-heading text-2xl font-semibold tracking-tight truncate" style={{ letterSpacing: '-0.01em' }}>
                {displayName}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] opacity-80 mt-1">
                @{username} · {data.personality.emoji} {data.personality.type.toUpperCase()}
              </div>
            </div>
            <StreakBadge compact />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div>
              <div className="font-heading text-[28px] font-semibold leading-none">
                {data.countryCodes.length}
              </div>
              <div className="font-mono text-[9px] tracking-[0.14em] opacity-60 mt-1">
                COUNTRIES
              </div>
            </div>
            <div>
              <div className="font-heading text-[28px] font-semibold leading-none">
                {data.cityCount}
              </div>
              <div className="font-mono text-[9px] tracking-[0.14em] opacity-60 mt-1">
                CITIES
              </div>
            </div>
            <div>
              <div className="font-heading text-[28px] font-semibold leading-none">
                {data.photoCount}
              </div>
              <div className="font-mono text-[9px] tracking-[0.14em] opacity-60 mt-1">
                PHOTOS
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-4 gap-2 sm:gap-3 mb-6"
      >
        {[
          { label: 'Countries', value: data.countryCodes.length, icon: Globe },
          { label: 'Cities', value: data.cityCount, icon: MapPin },
          { label: 'Photos', value: data.photoCount, icon: Camera },
          { label: 'km Traveled', value: data.totalDistanceKm >= 10000 ? `${(data.totalDistanceKm / 1000).toFixed(1)}k` : data.totalDistanceKm.toLocaleString(), icon: Route },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
            className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center"
          >
            <stat.icon className="size-4 sm:size-5 mx-auto mb-1.5 text-primary" />
            <div className="al-stat-value text-lg sm:text-xl tabular-nums">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Globe Coverage ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col items-center py-8">
            <GlobeCoverageRing percentage={globePct} countriesCount={data.countryCodes.length} />
            <p className="text-sm text-muted-foreground mt-4 font-medium">World Explored</p>
          </div>
        </div>
      </motion.div>

      {/* ── Countries Visited map ── */}
      {data.countryCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-6"
        >
          <p className="al-eyebrow mb-3 px-1">Your World</p>
          <PassportWorldMap albums={data.albums} />
        </motion.div>
      )}

      {/* ── Travel Personality ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-border bg-card px-5 sm:px-6 py-6">
          <p className="al-eyebrow mb-3">Travel Personality</p>
          <div className="flex items-start gap-4">
            <div className="size-14 sm:size-16 rounded-xl bg-muted/50 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
              {data.personality.emoji}
            </div>
            <div>
              <h3 className="font-heading text-base md:text-lg font-semibold text-foreground">{data.personality.type}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{data.personality.description}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Continent Progress ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <p className="al-eyebrow mb-3 px-1">Continent Progress</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.continentProgress.map((cont, i) => {
            const pct = cont.total > 0 ? (cont.visited / cont.total) * 100 : 0
            const visited = cont.visited > 0
            return (
              <motion.div
                key={cont.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.04 }}
                className={cn(
                  'rounded-2xl border border-border bg-card p-3.5 transition-colors duration-200',
                  visited
                    ? 'hover:border-primary/30'
                    : 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg">{CONTINENT_EMOJI[cont.name as Continent] || '🌍'}</span>
                  <span className="text-xs font-semibold text-foreground truncate">{cont.name}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, cont.visited > 0 ? 6 : 0)}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums font-medium">{cont.visited} of {cont.total}</p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Passport Stamps ── */}
      {data.countryCodes.length > 0 && (() => {
        // Build one stamp per country, using the earliest album as the visit date
        const earliestByCountry = new Map<string, string>()
        for (const a of data.albums) {
          const code = a.country_code?.toUpperCase()
          if (!code) continue
          const date = a.date_start || a.created_at
          if (!earliestByCountry.has(code) || (date && date < (earliestByCountry.get(code) || '9999'))) {
            earliestByCountry.set(code, date)
          }
        }
        const rotations = [-8, 5, -4, 7, -6, 3, -5, 6, -3, 4, -7, 2]
        const stamps = data.countryCodes.map((code, i) => {
          const date = earliestByCountry.get(code)
          return {
            code,
            name: getCountryName(code),
            rotation: rotations[i % rotations.length],
            dateLabel: date
              ? parseLocalDate(date)?.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase() ?? ''
              : '',
          }
        })

        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-end justify-between mb-3 px-1">
              <p className="al-eyebrow">Stamps · {stamps.length} {stamps.length === 1 ? 'country' : 'countries'}</p>
              <span
                className="font-mono text-[10px] tracking-wider uppercase"
                style={{ color: 'var(--color-muted-warm)' }}
              >
                {Math.round((stamps.length / 195) * 100)}% of the world
              </span>
            </div>
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: 'var(--color-ivory-alt)',
                border: '1px solid var(--color-line-warm)',
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                {stamps.map((s, i) => (
                  <motion.div
                    key={s.code}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 0.88, scale: 1 }}
                    transition={{
                      delay: 0.45 + i * 0.04,
                      type: 'spring',
                      stiffness: 180,
                      damping: 14,
                    }}
                    className="aspect-square flex items-center justify-center relative group"
                    style={{ transform: `rotate(${s.rotation}deg)` }}
                  >
                    <div
                      className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-center font-mono transition-transform group-hover:scale-[1.03]"
                      style={{
                        border: '2.5px solid var(--color-stamp)',
                        color: 'var(--color-stamp)',
                        background:
                          'radial-gradient(circle, transparent 60%, var(--color-ivory-alt))',
                      }}
                    >
                      <div className="text-[9px] tracking-[0.2em] font-bold opacity-85">
                        ★ ENTRY ★
                      </div>
                      <div
                        className="font-heading text-[30px] font-bold leading-none my-1"
                        style={{ letterSpacing: '0.04em' }}
                      >
                        {s.code}
                      </div>
                      <div className="text-[9px] tracking-[0.12em] font-semibold uppercase px-2 truncate max-w-full">
                        {s.name}
                      </div>
                      {s.dateLabel && (
                        <div className="text-[8px] tracking-[0.1em] opacity-70 mt-0.5">
                          {s.dateLabel}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )
      })()}

      {/* ── Travel Timeline + Journey Statements ── */}
      {(data.firstTrip || data.latestTrip) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <p className="al-eyebrow mb-3 px-1">Journey</p>
          <div className="al-card">
            {/* Narrative statements — "story of your travels" */}
            {(() => {
              const statements = buildJourneyStatements(data)
              if (statements.length === 0) return null
              return (
                <div
                  className="px-5 pt-5 pb-4 border-b"
                  style={{ borderColor: 'var(--color-line-warm)' }}
                >
                  <ul className="space-y-2.5">
                    {statements.map((s, i) => (
                      <li
                        key={i}
                        className="font-heading italic text-[15px] leading-relaxed"
                        style={{ color: 'var(--color-ink-soft)' }}
                      >
                        <span
                          className="mr-2 font-sans not-italic font-bold text-[12px]"
                          style={{ color: 'var(--color-coral)' }}
                        >
                          —
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            {/* Chronological markers */}
            <div className="py-5 px-5">
              <div className="flex flex-col gap-0">
                {data.firstTrip && (
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex items-center justify-center size-10 rounded-full"
                        style={{
                          background: 'var(--color-coral-tint)',
                          border: '1px solid var(--color-coral)',
                        }}
                      >
                        <Plane className="size-4" style={{ color: 'var(--color-coral)' }} />
                      </div>
                      {data.latestTrip && (
                        <div
                          className="w-0.5 h-8 mt-1"
                          style={{
                            background:
                              'linear-gradient(180deg, var(--color-coral), var(--color-gold))',
                          }}
                        />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="al-eyebrow">First Adventure</p>
                      <p
                        className="font-heading text-base font-semibold mt-1"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {data.firstTrip.location}
                      </p>
                      <p
                        className="font-mono text-[11px] tracking-wide mt-0.5"
                        style={{ color: 'var(--color-muted-warm)' }}
                      >
                        {parseLocalDate(data.firstTrip.date)?.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {data.latestTrip && (
                  <div className="flex items-start gap-3.5 mt-1">
                    <div
                      className="flex items-center justify-center size-10 rounded-full"
                      style={{
                        background: 'var(--color-gold-tint)',
                        border: '1px solid var(--color-gold)',
                      }}
                    >
                      <MapPin className="size-4" style={{ color: 'var(--color-gold)' }} />
                    </div>
                    <div className="pt-1">
                      <p className="al-eyebrow">Latest Adventure</p>
                      <p
                        className="font-heading text-base font-semibold mt-1"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {data.latestTrip.location}
                      </p>
                      <p
                        className="font-mono text-[11px] tracking-wide mt-0.5"
                        style={{ color: 'var(--color-muted-warm)' }}
                      >
                        {parseLocalDate(data.latestTrip.date)?.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Share — QR Code ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <div className="rounded-2xl border border-border bg-card">
          <div className="py-8 sm:py-10 px-6 flex flex-col items-center text-center">
            <h2 className="font-heading text-base md:text-lg font-semibold text-foreground">Share with friends</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
              Scan to see my travel profile
            </p>

            {shareUrl ? (
              <>
                <div className="mb-6">
                  <PassportQRCode url={qrUrl} size={180} />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2 cursor-pointer"
                  >
                    {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      size="sm"
                      onClick={handleShare}
                      className="gap-2 cursor-pointer"
                    >
                      <Share2 className="size-4" /> Share
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="mb-2 rounded-xl border border-border bg-muted/40 px-4 py-5 text-center max-w-xs">
                <p className="text-sm text-muted-foreground">
                  Add a username to get a shareable passport link.
                </p>
                <Button asChild size="sm" className="mt-3 cursor-pointer">
                  <a href="/settings">Set a username</a>
                </Button>
              </div>
            )}

            {/* ── Reciprocal action: scan someone else's passport ── */}
            <div className="w-full mt-7 pt-6 border-t border-border flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-3 max-w-xs">
                Met a fellow traveler? Scan their passport to connect.
              </p>
              <Button
                onClick={() => setScannerOpen(true)}
                className="gap-2 cursor-pointer w-full sm:w-auto"
              >
                <ScanLine className="size-4" /> Scan a passport
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {scannerOpen && <PassportScanner onClose={() => setScannerOpen(false)} />}
    </div>
  )
}
