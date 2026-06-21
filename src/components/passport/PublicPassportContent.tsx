'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, MapPin, Camera, Plane, Users, Share2, Copy, Check, ArrowRight,
  Trophy, Compass, Route, UserCheck, Landmark, Mountain, TreePine, Waves, Sun,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName } from '@/lib/utils/display-name'
import Image from 'next/image'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import QRCode from 'qrcode'

function countryCodeToFlag(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function formatDistance(km: number): string {
  if (km >= 10000) return `${(km / 1000).toFixed(0)}k`
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`
  return km.toLocaleString()
}

const continentIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  'Europe': Landmark, 'Asia': Mountain, 'North America': TreePine,
  'South America': TreePine, 'Africa': Sun, 'Oceania': Waves,
}

const countryNames: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', GT: 'Guatemala',
  BZ: 'Belize', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua',
  CR: 'Costa Rica', PA: 'Panama', CU: 'Cuba', JM: 'Jamaica',
  HT: 'Haiti', DO: 'Dominican Republic', TT: 'Trinidad & Tobago',
  BB: 'Barbados', BS: 'Bahamas', PR: 'Puerto Rico',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia',
  PY: 'Paraguay', UY: 'Uruguay', GY: 'Guyana', SR: 'Suriname',
  GB: 'United Kingdom', FR: 'France', DE: 'Germany', IT: 'Italy',
  ES: 'Spain', PT: 'Portugal', NL: 'Netherlands', BE: 'Belgium',
  CH: 'Switzerland', AT: 'Austria', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', IE: 'Ireland', PL: 'Poland',
  CZ: 'Czechia', RO: 'Romania', HU: 'Hungary', GR: 'Greece',
  HR: 'Croatia', BG: 'Bulgaria', SK: 'Slovakia', SI: 'Slovenia',
  LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia', CY: 'Cyprus',
  MT: 'Malta', LU: 'Luxembourg', IS: 'Iceland', AL: 'Albania',
  RS: 'Serbia', BA: 'Bosnia', ME: 'Montenegro', MK: 'North Macedonia',
  UA: 'Ukraine', TR: 'Turkey', RU: 'Russia', GE: 'Georgia',
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', EG: 'Egypt',
  MA: 'Morocco', GH: 'Ghana', TZ: 'Tanzania', ET: 'Ethiopia',
  UG: 'Uganda', SN: 'Senegal', TN: 'Tunisia', RW: 'Rwanda',
  BW: 'Botswana', NA: 'Namibia', MZ: 'Mozambique', MG: 'Madagascar',
  ZW: 'Zimbabwe', ZM: 'Zambia', AO: 'Angola', CM: 'Cameroon',
  MU: 'Mauritius', SC: 'Seychelles',
  CN: 'China', JP: 'Japan', KR: 'South Korea', IN: 'India',
  ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines',
  MY: 'Malaysia', SG: 'Singapore', MM: 'Myanmar', KH: 'Cambodia',
  LA: 'Laos', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal',
  PK: 'Pakistan', IR: 'Iran', SA: 'Saudi Arabia', AE: 'UAE',
  QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman',
  JO: 'Jordan', LB: 'Lebanon', IL: 'Israel', TW: 'Taiwan',
  HK: 'Hong Kong', MN: 'Mongolia', UZ: 'Uzbekistan', KZ: 'Kazakhstan',
  MV: 'Maldives', BT: 'Bhutan',
  AU: 'Australia', NZ: 'New Zealand', FJ: 'Fiji', PG: 'Papua New Guinea',
  WS: 'Samoa', TO: 'Tonga', VU: 'Vanuatu', NC: 'New Caledonia',
  PF: 'French Polynesia',
}

// ---------------------------------------------------------------------------
// QR Code component
// ---------------------------------------------------------------------------
function ProfileQRCode({ url, size = 160 }: { url: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 2,
      color: { dark: '#2d3a1a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {})
  }, [url, size])

  if (!qrDataUrl) return <div style={{ width: size, height: size }} className="bg-muted rounded-xl animate-pulse" />

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden bg-card p-3 border border-border">
        <Image src={qrDataUrl} alt="QR Code" width={size} height={size} className="block rounded-xl" />
      </div>
      <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
        <Compass className="size-3.5 text-primary-foreground" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Globe Coverage Ring
// ---------------------------------------------------------------------------
function GlobeCoverageRing({ percentage, countriesCount }: { percentage: number; countriesCount: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" stroke="var(--muted)" />
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="7"
          stroke="var(--color-coral)" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="al-stat-value text-2xl tabular-nums">{percentage.toFixed(1)}%</span>
        <span className="font-mono text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
          {countriesCount} / 195
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  user: { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null; created_at: string }
  countryCodes: string[]
  cities: string[]
  totalAlbums: number
  totalPhotos: number
  totalDistance: number
  followerCount: number
  continentsVisited: string[]
  personality: string
  firstTrip: { title: string; location: string | null; date: string } | null
  latestTrip: { title: string; location: string | null; date: string } | null
  memberSince: string
}

export function PublicPassportContent({
  user, countryCodes, cities, totalPhotos, totalDistance,
  followerCount, continentsVisited, personality, firstTrip, latestTrip, memberSince
}: Props) {
  const displayName = getDisplayName(user.display_name, user.username)
  const [copied, setCopied] = useState(false)
  const worldPercent = (countryCodes.length / 195) * 100
  const searchParams = useSearchParams()
  const { user: currentUser } = useAuth()

  // Auto-connect state
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const connectAttempted = useRef(false)

  // Auto-connect when arriving via QR scan (?connect=true)
  useEffect(() => {
    const shouldConnect = searchParams.get('connect') === 'true'
    if (!shouldConnect || !currentUser || currentUser.id === user.id || connectAttempted.current) return
    connectAttempted.current = true

    setConnectStatus('connecting')

    apiFetch('/api/passport/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: user.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.connected) {
          setConnectStatus('connected')
        } else {
          setConnectStatus('error')
        }
      })
      .catch(() => {
        setConnectStatus('error')
        log.error('Passport auto-connect failed', { component: 'PublicPassport', action: 'connect' })
      })
  }, [searchParams, currentUser, user.id])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopy = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = `Check out ${displayName}'s travel profile on Adventure Log!`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s Travel Profile`, text, url })
      } else {
        await handleCopy()
      }
    } catch { /* cancelled */ }
  }

  const allContinents = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania']

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-olive-800 via-olive-900 to-[#0f1f05]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.15)_0%,_transparent_50%)]" />

        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Avatar className="w-24 h-24 mx-auto mb-4 ring-2 ring-white/20">
              <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={displayName} />
              <AvatarFallback className="text-2xl bg-olive-700 text-white font-heading">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-1">{displayName}</h1>
            <p className="text-white/90 mb-3 text-sm">@{user.username}</p>
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Trophy className="h-4 w-4 text-white/90" />
            <span className="text-white font-semibold text-sm">{personality}</span>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-auto block" preserveAspectRatio="none">
            <path d="M0 60V20C240 0 480 0 720 10C960 20 1200 40 1440 30V60H0Z" className="fill-background" />
          </svg>
        </div>
      </motion.section>

      <div className="max-w-3xl mx-auto px-6">
        {/* ── Connection Banner ── */}
        <AnimatePresence>
          {connectStatus === 'connected' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 -mt-3 relative z-20"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <UserCheck className="size-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  You and <span className="font-semibold">{displayName}</span> are now following each other
                </p>
              </div>
            </motion.div>
          )}
          {connectStatus === 'connecting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 -mt-3 relative z-20"
            >
              <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                <p className="text-sm text-muted-foreground">Connecting...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats Bar ── */}
        <motion.div
          className="-mt-6 relative z-10 rounded-2xl border border-border bg-card p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { icon: Globe, value: countryCodes.length, label: 'Countries' },
              { icon: MapPin, value: cities.length, label: 'Cities' },
              { icon: Camera, value: totalPhotos, label: 'Photos' },
              { icon: Route, value: `${formatDistance(totalDistance)}km`, label: 'Traveled' },
              { icon: Users, value: followerCount, label: 'Followers' },
              { icon: Globe, value: `${worldPercent.toFixed(1)}%`, label: 'of World' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <stat.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="al-stat-value text-xl md:text-2xl tabular-nums">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="al-eyebrow text-[10px]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Globe Coverage Ring ── */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <GlobeCoverageRing percentage={worldPercent} countriesCount={countryCodes.length} />
        </motion.div>

        {/* ── Continent Progress ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <p className="al-eyebrow mb-3">Continents</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allContinents.map((continent, i) => {
              const visited = continentsVisited.includes(continent)
              return (
                <motion.div
                  key={continent}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card transition-colors duration-200",
                    visited
                      ? "hover:border-primary/30"
                      : "opacity-50"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: visited ? 1 : 0.5, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  {(() => {
                    const Icon = continentIcon[continent] || Globe
                    return <Icon className={cn("h-5 w-5", visited ? "text-primary" : "text-muted-foreground")} />
                  })()}
                  <div>
                    <p className={cn("text-sm font-semibold", visited ? "text-foreground" : "text-muted-foreground")}>
                      {continent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {visited ? '✓ Explored' : 'Not yet'}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Countries Visited ── */}
        {countryCodes.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <p className="al-eyebrow mb-3">Countries Visited</p>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                {countryCodes.map((code, i) => (
                  <motion.div
                    key={code}
                    className="group relative"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.02, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 hover:bg-primary/15 hover:border-primary/30 transition-colors duration-200 cursor-default">
                      <span className="text-xl leading-none">{countryCodeToFlag(code)}</span>
                      <span className="font-mono text-xs font-semibold text-primary">{code}</span>
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {countryNames[code] || code}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Travel Timeline ── */}
        {(firstTrip || latestTrip) && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <p className="al-eyebrow mb-3">Journey</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {firstTrip && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="al-eyebrow text-[10px]">First Adventure</span>
                  </div>
                  <p className="font-heading font-semibold text-foreground">{firstTrip.title}</p>
                  {firstTrip.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {firstTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="font-mono text-xs tracking-wide text-muted-foreground mt-1">
                    {new Date(firstTrip.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {latestTrip && latestTrip !== firstTrip && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="al-eyebrow text-[10px]">Latest Adventure</span>
                  </div>
                  <p className="font-heading font-semibold text-foreground">{latestTrip.title}</p>
                  {latestTrip.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {latestTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="font-mono text-xs tracking-wide text-muted-foreground mt-1">
                    {new Date(latestTrip.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Share — QR Code ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="rounded-2xl border border-border bg-card">
            <div className="py-8 sm:py-10 px-6 flex flex-col items-center text-center">
              <h2 className="font-heading text-base md:text-lg font-semibold text-foreground">Share this profile</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                Scan to see {displayName}&apos;s travel profile
              </p>

              <div className="mb-6">
                <ProfileQRCode url={shareUrl} size={160} />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="cursor-pointer gap-2"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    size="sm"
                    onClick={handleShare}
                    className="cursor-pointer gap-2"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.footer
          className="text-center py-10 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p className="font-mono text-xs tracking-wide text-muted-foreground mb-1">
            Member since {new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Powered by{' '}
            <Link href="/" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Adventure Log
            </Link>
          </p>
          <Link href="/signup">
            <Button variant="coral" className="cursor-pointer px-8 gap-2">
              Create Your Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
