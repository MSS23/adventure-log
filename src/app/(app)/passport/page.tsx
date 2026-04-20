'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import Image from 'next/image'
import {
  Globe, MapPin, Camera, Route, Share2, Loader2, Compass, Plane,
  Copy, Check,
} from 'lucide-react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'

// ---------------------------------------------------------------------------
// Country-to-continent mapping
// ---------------------------------------------------------------------------
const continentMap: Record<string, string> = {
  US: 'North America', CA: 'North America', MX: 'North America',
  GT: 'North America', BZ: 'North America', HN: 'North America',
  SV: 'North America', NI: 'North America', CR: 'North America',
  PA: 'North America', CU: 'North America', JM: 'North America',
  HT: 'North America', DO: 'North America', TT: 'North America',
  BB: 'North America', BS: 'North America', PR: 'North America',
  AG: 'North America', DM: 'North America', GD: 'North America',
  KN: 'North America', LC: 'North America', VC: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America',
  CO: 'South America', PE: 'South America', VE: 'South America',
  EC: 'South America', BO: 'South America', PY: 'South America',
  UY: 'South America', GY: 'South America', SR: 'South America',
  GF: 'South America',
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe',
  ES: 'Europe', PT: 'Europe', NL: 'Europe', BE: 'Europe',
  CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe',
  DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe',
  CZ: 'Europe', RO: 'Europe', HU: 'Europe', GR: 'Europe',
  HR: 'Europe', BG: 'Europe', SK: 'Europe', SI: 'Europe',
  LT: 'Europe', LV: 'Europe', EE: 'Europe', CY: 'Europe',
  MT: 'Europe', LU: 'Europe', IS: 'Europe', AL: 'Europe',
  RS: 'Europe', BA: 'Europe', ME: 'Europe', MK: 'Europe',
  XK: 'Europe', MD: 'Europe', UA: 'Europe', BY: 'Europe',
  RU: 'Europe', GE: 'Europe', AM: 'Europe', AZ: 'Europe',
  TR: 'Europe', MC: 'Europe', AD: 'Europe', SM: 'Europe',
  VA: 'Europe', LI: 'Europe',
  ZA: 'Africa', NG: 'Africa', KE: 'Africa', EG: 'Africa',
  MA: 'Africa', GH: 'Africa', TZ: 'Africa', ET: 'Africa',
  UG: 'Africa', SN: 'Africa', CI: 'Africa', CM: 'Africa',
  MZ: 'Africa', MG: 'Africa', AO: 'Africa', ZM: 'Africa',
  ZW: 'Africa', BW: 'Africa', NA: 'Africa', RW: 'Africa',
  TN: 'Africa', DZ: 'Africa', LY: 'Africa', SD: 'Africa',
  ML: 'Africa', NE: 'Africa', TD: 'Africa', GA: 'Africa',
  CG: 'Africa', CD: 'Africa', BJ: 'Africa', BF: 'Africa',
  TG: 'Africa', SL: 'Africa', LR: 'Africa', GN: 'Africa',
  GW: 'Africa', CV: 'Africa', MU: 'Africa', SC: 'Africa',
  ER: 'Africa', DJ: 'Africa', SO: 'Africa', MW: 'Africa',
  LS: 'Africa', SZ: 'Africa', GM: 'Africa', MR: 'Africa',
  SS: 'Africa', CF: 'Africa', GQ: 'Africa', ST: 'Africa',
  KM: 'Africa',
  CN: 'Asia', JP: 'Asia', KR: 'Asia', IN: 'Asia',
  ID: 'Asia', TH: 'Asia', VN: 'Asia', PH: 'Asia',
  MY: 'Asia', SG: 'Asia', MM: 'Asia', KH: 'Asia',
  LA: 'Asia', BD: 'Asia', LK: 'Asia', NP: 'Asia',
  PK: 'Asia', AF: 'Asia', IR: 'Asia', IQ: 'Asia',
  SA: 'Asia', AE: 'Asia', QA: 'Asia', KW: 'Asia',
  BH: 'Asia', OM: 'Asia', YE: 'Asia', JO: 'Asia',
  LB: 'Asia', SY: 'Asia', IL: 'Asia', PS: 'Asia',
  UZ: 'Asia', KZ: 'Asia', KG: 'Asia', TJ: 'Asia',
  TM: 'Asia', MN: 'Asia', BN: 'Asia', TL: 'Asia',
  MV: 'Asia', BT: 'Asia', TW: 'Asia', HK: 'Asia',
  MO: 'Asia', KP: 'Asia',
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
  WS: 'Oceania', TO: 'Oceania', VU: 'Oceania', SB: 'Oceania',
  KI: 'Oceania', FM: 'Oceania', MH: 'Oceania', PW: 'Oceania',
  NR: 'Oceania', TV: 'Oceania', CK: 'Oceania', NU: 'Oceania',
  NC: 'Oceania', PF: 'Oceania', GU: 'Oceania',
}

const continentTotals: Record<string, number> = {
  'North America': 23, 'South America': 13, 'Europe': 50,
  'Africa': 54, 'Asia': 48, 'Oceania': 14,
}

const continentEmoji: Record<string, string> = {
  'Europe': '🏰', 'Asia': '🏯', 'North America': '🗽',
  'South America': '🌿', 'Africa': '🦁', 'Oceania': '🏝️',
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

function getFlag(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Travel personality
// ---------------------------------------------------------------------------
interface PersonalityResult { type: string; emoji: string; description: string }

function computePersonality(countryCodes: string[], albumCount: number): PersonalityResult {
  const unique = countryCodes.length
  const continents = new Set(countryCodes.map(c => continentMap[c]).filter(Boolean))

  if (unique === 0) return { type: 'Rising Explorer', emoji: '🌱', description: 'Your journey is just beginning. Every great explorer started with a single step — your first adventure awaits.' }
  if (continents.size >= 4) return { type: 'Cultural Nomad', emoji: '🌍', description: 'You seek diversity across continents, immersing yourself in cultures far and wide.' }
  if (unique >= 10) return { type: 'Globe Trotter', emoji: '✈️', description: 'With 10+ countries under your belt, you\'re a seasoned traveler who thrives on new horizons.' }
  if (unique <= 3 && albumCount >= 8) return { type: 'Deep Diver', emoji: '🤿', description: 'You believe in truly knowing a place. Rather than skimming, you explore every corner.' }
  if (albumCount >= 10 && unique <= 5) return { type: 'Weekend Warrior', emoji: '🎒', description: 'You make the most of every opportunity, packing adventures into every spare moment.' }
  if (unique >= 3) return { type: 'Urban Explorer', emoji: '🏙️', description: 'Cities are your playground. From hidden alleys to rooftop bars, you uncover a city\'s soul.' }
  return { type: 'Rising Explorer', emoji: '🌱', description: 'Your journey is just beginning — keep going!' }
}

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
      new Date(d.latestTrip.date).getFullYear() -
      new Date(d.firstTrip.date).getFullYear()
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
      (Date.now() - new Date(d.latestTrip.date).getTime()) / (1000 * 60 * 60 * 24 * 30)
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
// Data hook
// ---------------------------------------------------------------------------
interface PassportAlbum {
  id: string; title: string; location_name: string | null; country_code: string | null
  latitude: number; longitude: number; date_start: string | null; created_at: string; cover_photo_url: string | null
}

interface PassportData {
  albums: PassportAlbum[]; photoCount: number; countryCodes: string[]; cityCount: number
  totalDistanceKm: number; personality: PersonalityResult
  continentProgress: { name: string; visited: number; total: number }[]
  firstTrip: { date: string; location: string } | null
  latestTrip: { date: string; location: string } | null
}

async function backfillMissingCountryCodes(
  albums: PassportAlbum[],
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, string>> {
  const missing = albums.filter(a => !a.country_code && a.latitude && a.longitude)
  if (missing.length === 0) return {}

  const resolved: Record<string, string> = {}

  for (const album of missing) {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: album.latitude.toString(),
          lon: album.longitude.toString(),
          format: 'json',
          addressdetails: '1',
          'accept-language': 'en',
        }),
        { headers: { 'User-Agent': 'AdventureLog/1.0' } }
      )
      if (resp.ok) {
        const data = await resp.json()
        const code = data?.address?.country_code?.toUpperCase()
        if (code && code.length === 2) {
          resolved[album.id] = code
          await supabase
            .from('albums')
            .update({ country_code: code })
            .eq('id', album.id)
        }
      }
      if (missing.indexOf(album) < missing.length - 1) {
        await new Promise(r => setTimeout(r, 1100))
      }
    } catch {
      // Skip failed geocoding
    }
  }

  return resolved
}

function useTravelPassport() {
  const { user } = useAuth()
  const [data, setData] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: albums } = await supabase
        .from('albums')
        .select('id, title, location_name, country_code, latitude, longitude, date_start, created_at, cover_photo_url')
        .eq('user_id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .neq('status', 'draft')
        .order('date_start', { ascending: true, nullsFirst: false })

      const { count: photoCount } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const validAlbums = (albums || []) as PassportAlbum[]

      const backfilled = await backfillMissingCountryCodes(validAlbums, supabase)
      for (const album of validAlbums) {
        if (!album.country_code && backfilled[album.id]) {
          album.country_code = backfilled[album.id]
        }
      }

      const countryCodes = [...new Set(validAlbums.map(a => a.country_code?.toUpperCase()).filter((c): c is string => !!c))]
      const cities = new Set(validAlbums.map(a => a.location_name?.split(',')[0]?.trim()).filter(Boolean))

      const sorted = [...validAlbums].sort((a, b) => new Date(a.date_start || a.created_at).getTime() - new Date(b.date_start || b.created_at).getTime())
      let totalDistanceKm = 0
      for (let i = 1; i < sorted.length; i++) {
        totalDistanceKm += haversineKm(sorted[i - 1].latitude, sorted[i - 1].longitude, sorted[i].latitude, sorted[i].longitude)
      }

      const visitedByCont: Record<string, Set<string>> = {}
      for (const code of countryCodes) {
        const cont = continentMap[code]
        if (cont) { if (!visitedByCont[cont]) visitedByCont[cont] = new Set(); visitedByCont[cont].add(code) }
      }

      let firstTrip: PassportData['firstTrip'] = null
      let latestTrip: PassportData['latestTrip'] = null
      if (sorted.length > 0) {
        const first = sorted[0]
        firstTrip = { date: first.date_start || first.created_at, location: first.location_name || first.title }
        const latest = sorted[sorted.length - 1]
        latestTrip = { date: latest.date_start || latest.created_at, location: latest.location_name || latest.title }
      }

      setData({
        albums: validAlbums,
        photoCount: photoCount || 0,
        countryCodes,
        cityCount: cities.size,
        totalDistanceKm: Math.round(totalDistanceKm),
        personality: computePersonality(countryCodes, validAlbums.length),
        continentProgress: Object.entries(continentTotals).map(([name, total]) => ({
          name, visited: visitedByCont[name]?.size || 0, total,
        })),
        firstTrip,
        latestTrip,
      })
    } catch (err) {
      log.error('Failed to load passport', { component: 'TravelPassport', action: 'fetch' }, err as Error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading }
}

// ---------------------------------------------------------------------------
// QR Code component — premium passport style
// ---------------------------------------------------------------------------
function PassportQRCode({ url, size = 180 }: { url: string; size?: number }) {
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

  if (!qrDataUrl) return <div style={{ width: size, height: size }} className="bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse" />

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden bg-white p-3 shadow-xl shadow-olive-900/10 dark:shadow-black/40 border-2 border-olive-100 dark:border-olive-800/50">
        <Image src={qrDataUrl} alt="QR Code" width={size} height={size} className="block rounded-lg" />
      </div>
      <div className="absolute -bottom-2 -right-2 size-9 rounded-full bg-gradient-to-br from-olive-500 to-olive-700 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-stone-900">
        <Compass className="size-4 text-white" />
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
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="5" className="text-stone-200 dark:text-stone-800" stroke="currentColor" />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2A179" />
            <stop offset="50%" stopColor="#E2553A" />
            <stop offset="100%" stopColor="#A2322B" />
          </linearGradient>
        </defs>
        <circle
          cx="70" cy="70" r={radius} fill="none" strokeWidth="7"
          stroke="url(#progressGrad)" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <circle
          cx="70" cy="70" r={radius} fill="none" strokeWidth="7"
          stroke="url(#progressGrad)" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)', filter: 'blur(8px)', opacity: 0.35 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-olive-800 dark:text-olive-200 tabular-nums">{percentage.toFixed(1)}%</span>
        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] mt-0.5">
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
  const { user, profile } = useAuth()
  const { data, loading } = useTravelPassport()
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/u/${profile?.username || user?.id || ''}/passport?connect=true`
  }, [profile, user])

  const handleShare = useCallback(async () => {
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-olive-600 dark:text-olive-400" />
          <p className="text-stone-400 text-sm">Loading passport...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-400">Unable to load passport data.</p>
      </div>
    )
  }

  const globePct = (data.countryCodes.length / 195) * 100
  const displayName = profile?.display_name || profile?.username || 'Traveler'
  const avatarUrl = getPhotoUrl(profile?.avatar_url, 'avatars') || undefined
  const username = profile?.username || ''

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 sm:pt-8">
      {/* Editorial header */}
      <div className="mb-6">
        <p className="al-eyebrow mb-1">Document</p>
        <h1 className="al-display text-3xl md:text-4xl">Passport</h1>
      </div>

      {/* ── Leather passport book ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-6"
        style={{
          background: 'linear-gradient(135deg, #3D2416 0%, #5A3622 50%, #3D2416 100%)',
          color: '#E8D4A8',
          boxShadow: '0 4px 8px rgba(26,20,14,0.06), 0 16px 40px rgba(26,20,14,0.18)',
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
            <div className="min-w-0">
              <div className="font-heading text-2xl font-semibold tracking-tight truncate" style={{ letterSpacing: '-0.01em' }}>
                {displayName}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] opacity-80 mt-1">
                @{username} · {data.personality.emoji} {data.personality.type.toUpperCase()}
              </div>
            </div>
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
          { label: 'Countries', value: data.countryCodes.length, icon: Globe, color: 'olive' },
          { label: 'Cities', value: data.cityCount, icon: MapPin, color: 'emerald' },
          { label: 'Photos', value: data.photoCount, icon: Camera, color: 'sky' },
          { label: 'km Traveled', value: data.totalDistanceKm >= 10000 ? `${(data.totalDistanceKm / 1000).toFixed(1)}k` : data.totalDistanceKm.toLocaleString(), icon: Route, color: 'amber' },
        ].map((stat, i) => {
          const colorMap: Record<string, { bg: string; icon: string }> = {
            olive: { bg: 'from-olive-50 to-olive-100/80 dark:from-olive-950/50 dark:to-olive-900/30 border-olive-200/60 dark:border-olive-800/40', icon: 'text-olive-600 dark:text-olive-400' },
            emerald: { bg: 'from-emerald-50 to-emerald-100/80 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40', icon: 'text-emerald-600 dark:text-emerald-400' },
            sky: { bg: 'from-sky-50 to-sky-100/80 dark:from-sky-950/50 dark:to-sky-900/30 border-sky-200/60 dark:border-sky-800/40', icon: 'text-sky-600 dark:text-sky-400' },
            amber: { bg: 'from-amber-50 to-amber-100/80 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/60 dark:border-amber-800/40', icon: 'text-amber-600 dark:text-amber-400' },
          }
          const colors = colorMap[stat.color]
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              className={cn('rounded-2xl bg-gradient-to-br p-3 sm:p-4 text-center border', colors.bg)}
            >
              <stat.icon className={cn('size-4 sm:size-5 mx-auto mb-1.5', colors.icon)} />
              <div className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">{stat.label}</div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Globe Coverage ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-[#111] overflow-hidden">
          <div className="relative flex flex-col items-center py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,154,62,0.05)_0%,_transparent_70%)]" />
            <div className="relative">
              <GlobeCoverageRing percentage={globePct} countriesCount={data.countryCodes.length} />
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-4 font-medium">World Explored</p>
          </div>
        </div>
      </motion.div>

      {/* ── Travel Personality ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700/60 overflow-hidden">
          <div className="relative bg-gradient-to-r from-olive-50 via-olive-50/50 to-stone-50 dark:from-olive-950/40 dark:via-olive-950/20 dark:to-[#111] px-5 sm:px-6 py-6">
            <div className="absolute top-2 right-3 text-olive-200/20 dark:text-olive-800/20">
              <Compass className="size-16" strokeWidth={0.8} />
            </div>
            <p className="text-[10px] font-bold text-olive-600/50 dark:text-olive-400/40 uppercase tracking-[0.25em] mb-3">Travel Personality</p>
            <div className="flex items-start gap-4 relative z-10">
              <div className="size-14 sm:size-16 rounded-2xl bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-3xl sm:text-4xl shrink-0 border border-olive-100 dark:border-olive-800/40">
                {data.personality.emoji}
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-olive-800 dark:text-olive-200 font-heading">{data.personality.type}</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">{data.personality.description}</p>
              </div>
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
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] mb-3 px-1">Continent Progress</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                  'rounded-2xl border p-3.5 transition-all duration-200',
                  visited
                    ? 'border-olive-200 dark:border-olive-800/60 bg-olive-50/50 dark:bg-olive-950/20 hover:shadow-sm hover:border-olive-300 dark:hover:border-olive-700'
                    : 'border-stone-200 dark:border-stone-800 opacity-40 hover:opacity-60'
                )}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg">{continentEmoji[cont.name] || '🌍'}</span>
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">{cont.name}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-olive-500 to-olive-400 dark:from-olive-400 dark:to-olive-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, cont.visited > 0 ? 6 : 0)}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1.5 tabular-nums font-medium">{cont.visited} of {cont.total}</p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Countries Visited ── */}
      {data.countryCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] mb-3 px-1">Countries Visited</p>
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-[#111] p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {data.countryCodes.map((code, i) => (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.03, type: 'spring', stiffness: 200, damping: 15 }}
                  className="group relative"
                >
                  <div className="flex items-center gap-1.5 bg-olive-50 dark:bg-olive-950/40 border border-olive-200/80 dark:border-olive-800/50 rounded-xl px-3 py-2 hover:bg-olive-100 dark:hover:bg-olive-900/40 transition-all duration-200 cursor-default hover:shadow-sm hover:scale-105">
                    <span className="text-xl leading-none">{getFlag(code)}</span>
                    <span className="text-xs font-semibold text-olive-700 dark:text-olive-300">{code}</span>
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {countryNames[code] || code}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

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
                        {new Date(data.firstTrip.date).toLocaleDateString('en-US', {
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
                        {new Date(data.latestTrip.date).toLocaleDateString('en-US', {
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
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-[#111]">
          <div className="py-8 sm:py-10 px-6 flex flex-col items-center text-center">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">Share with friends</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-6 max-w-xs">
              Scan to see my travel profile
            </p>

            <div className="mb-6">
              <PassportQRCode url={shareUrl} size={180} />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2 rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-olive-500"
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  size="sm"
                  onClick={handleShare}
                  className="gap-2 bg-olive-600 hover:bg-olive-700 text-white rounded-xl cursor-pointer active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
                >
                  <Share2 className="size-4" /> Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
