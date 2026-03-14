'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import {
  Globe,
  MapPin,
  Camera,
  Route,
  Share2,
  Copy,
  Check,
  Loader2,
  Compass,
  Plane,
} from 'lucide-react'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Country-to-continent mapping (ISO 2-letter codes)
// ---------------------------------------------------------------------------
const continentMap: Record<string, string> = {
  // North America
  US: 'North America', CA: 'North America', MX: 'North America',
  GT: 'North America', BZ: 'North America', HN: 'North America',
  SV: 'North America', NI: 'North America', CR: 'North America',
  PA: 'North America', CU: 'North America', JM: 'North America',
  HT: 'North America', DO: 'North America', TT: 'North America',
  BB: 'North America', BS: 'North America', PR: 'North America',
  AG: 'North America', DM: 'North America', GD: 'North America',
  KN: 'North America', LC: 'North America', VC: 'North America',
  // South America
  BR: 'South America', AR: 'South America', CL: 'South America',
  CO: 'South America', PE: 'South America', VE: 'South America',
  EC: 'South America', BO: 'South America', PY: 'South America',
  UY: 'South America', GY: 'South America', SR: 'South America',
  GF: 'South America',
  // Europe
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
  // Africa
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
  // Asia
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
  // Oceania
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
  WS: 'Oceania', TO: 'Oceania', VU: 'Oceania', SB: 'Oceania',
  KI: 'Oceania', FM: 'Oceania', MH: 'Oceania', PW: 'Oceania',
  NR: 'Oceania', TV: 'Oceania', CK: 'Oceania', NU: 'Oceania',
  NC: 'Oceania', PF: 'Oceania', GU: 'Oceania',
}

// Total countries per continent for progress bars
const continentTotals: Record<string, number> = {
  'North America': 23,
  'South America': 13,
  'Europe': 50,
  'Africa': 54,
  'Asia': 48,
  'Oceania': 14,
}

// ---------------------------------------------------------------------------
// Country code to flag emoji
// ---------------------------------------------------------------------------
function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

// ---------------------------------------------------------------------------
// Country code to name (common countries)
// ---------------------------------------------------------------------------
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
// Haversine distance (km)
// ---------------------------------------------------------------------------
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Travel personality logic
// ---------------------------------------------------------------------------
interface PersonalityResult {
  type: string
  emoji: string
  description: string
}

function computePersonality(
  countryCodes: string[],
  albumCount: number,
): PersonalityResult {
  const uniqueCountries = countryCodes.length
  const continents = new Set(countryCodes.map((c) => continentMap[c]).filter(Boolean))

  if (uniqueCountries === 0) {
    return {
      type: 'Rising Explorer',
      emoji: '🌱',
      description:
        'Your journey is just beginning. Every great explorer started with a single step — your first adventure awaits.',
    }
  }

  if (continents.size >= 4) {
    return {
      type: 'Cultural Nomad',
      emoji: '🌍',
      description:
        'You seek diversity across continents, immersing yourself in cultures far and wide. The world is your classroom.',
    }
  }

  if (uniqueCountries >= 10) {
    return {
      type: 'Globe Trotter',
      emoji: '✈️',
      description:
        'With 10+ countries under your belt, you are a seasoned traveler who thrives on discovering new horizons.',
    }
  }

  if (uniqueCountries <= 3 && albumCount >= 8) {
    return {
      type: 'Deep Diver',
      emoji: '🤿',
      description:
        'You believe in truly knowing a place. Rather than skimming the surface, you return and explore every corner.',
    }
  }

  if (albumCount >= 10 && uniqueCountries <= 5) {
    return {
      type: 'Weekend Warrior',
      emoji: '🎒',
      description:
        'You make the most of every opportunity to travel, packing adventures into every spare moment.',
    }
  }

  if (uniqueCountries >= 3) {
    return {
      type: 'Urban Explorer',
      emoji: '🏙️',
      description:
        'Cities are your playground. From hidden alleys to rooftop bars, you know how to uncover a city\'s soul.',
    }
  }

  return {
    type: 'Rising Explorer',
    emoji: '🌱',
    description:
      'Your journey is just beginning. Every great explorer started with a single step — keep going!',
  }
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------
interface PassportAlbum {
  id: string
  title: string
  location_name: string | null
  country_code: string | null
  latitude: number
  longitude: number
  date_start: string | null
  created_at: string
  cover_photo_url: string | null
}

interface PassportData {
  albums: PassportAlbum[]
  photoCount: number
  countryCodes: string[]
  cityCount: number
  totalDistanceKm: number
  personality: PersonalityResult
  continentProgress: { name: string; visited: number; total: number }[]
  firstTrip: { date: string; location: string } | null
  latestTrip: { date: string; location: string } | null
}

// ---------------------------------------------------------------------------
// useTravelPassport hook
// ---------------------------------------------------------------------------
function useTravelPassport() {
  const { user } = useAuth()
  const [data, setData] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const supabase = createClient()

      // Fetch albums with location data
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select('id, title, location_name, country_code, latitude, longitude, date_start, created_at, cover_photo_url')
        .eq('user_id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .neq('status', 'draft')
        .order('date_start', { ascending: true, nullsFirst: false })

      if (albumsError) {
        log.error('Failed to fetch passport albums', { component: 'TravelPassport', action: 'fetch-albums' }, albumsError as unknown as Error)
      }

      // Fetch photo count
      const { count: photoCount, error: photosError } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (photosError) {
        log.error('Failed to fetch photo count', { component: 'TravelPassport', action: 'fetch-photos' }, photosError as unknown as Error)
      }

      const validAlbums: PassportAlbum[] = (albums || []) as PassportAlbum[]

      // Unique country codes
      const countryCodes = [
        ...new Set(
          validAlbums
            .map((a) => a.country_code?.toUpperCase())
            .filter((c): c is string => !!c),
        ),
      ]

      // Unique cities (from location_name, take the city part before first comma)
      const cities = new Set(
        validAlbums
          .map((a) => {
            if (!a.location_name) return null
            return a.location_name.split(',')[0].trim()
          })
          .filter(Boolean),
      )

      // Total distance via Haversine (chronological)
      const sorted = [...validAlbums].sort((a, b) => {
        const dateA = a.date_start || a.created_at
        const dateB = b.date_start || b.created_at
        return new Date(dateA).getTime() - new Date(dateB).getTime()
      })

      let totalDistanceKm = 0
      for (let i = 1; i < sorted.length; i++) {
        totalDistanceKm += haversineKm(
          sorted[i - 1].latitude, sorted[i - 1].longitude,
          sorted[i].latitude, sorted[i].longitude,
        )
      }

      // Personality
      const personality = computePersonality(countryCodes, validAlbums.length)

      // Continent progress
      const visitedByCont: Record<string, Set<string>> = {}
      for (const code of countryCodes) {
        const cont = continentMap[code]
        if (cont) {
          if (!visitedByCont[cont]) visitedByCont[cont] = new Set()
          visitedByCont[cont].add(code)
        }
      }
      const continentProgress = Object.entries(continentTotals).map(([name, total]) => ({
        name,
        visited: visitedByCont[name]?.size || 0,
        total,
      }))

      // First and latest trip
      let firstTrip: PassportData['firstTrip'] = null
      let latestTrip: PassportData['latestTrip'] = null
      if (sorted.length > 0) {
        const first = sorted[0]
        firstTrip = {
          date: first.date_start || first.created_at,
          location: first.location_name || first.title,
        }
        const latest = sorted[sorted.length - 1]
        latestTrip = {
          date: latest.date_start || latest.created_at,
          location: latest.location_name || latest.title,
        }
      }

      setData({
        albums: validAlbums,
        photoCount: photoCount || 0,
        countryCodes,
        cityCount: cities.size,
        totalDistanceKm: Math.round(totalDistanceKm),
        personality,
        continentProgress,
        firstTrip,
        latestTrip,
      })
    } catch (err) {
      log.error('Failed to load travel passport', { component: 'TravelPassport', action: 'fetch' }, err as Error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading }
}

// ---------------------------------------------------------------------------
// Globe Coverage Ring component
// ---------------------------------------------------------------------------
function GlobeCoverageRing({ percentage }: { percentage: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
        {/* Background ring */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-stone-200 dark:text-stone-700"
        />
        {/* Progress ring */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-olive-600 dark:text-olive-400"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-olive-800 dark:text-olive-200">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          of the world
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------
function fadeUpProps(index: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function TravelPassportPage() {
  const { user, profile } = useAuth()
  const { data, loading } = useTravelPassport()
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const username = profile?.username || user?.id || ''
    return `${window.location.origin}/u/${username}`
  }, [profile, user])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      log.warn('Clipboard write failed', { component: 'TravelPassport', action: 'copy-link' })
    }
  }, [shareUrl])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || profile?.username || 'My'} Travel Passport`,
          text: 'Check out my Travel Passport!',
          url: shareUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }, [shareUrl, profile, handleCopyLink])

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-olive-600 dark:text-olive-400" />
          <p className="text-stone-500 dark:text-stone-400 text-sm">Loading your passport...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-500 dark:text-stone-400">Unable to load passport data.</p>
      </div>
    )
  }

  const globePercentage = (data.countryCodes.length / 195) * 100

  const stats = [
    { label: 'Countries', value: data.countryCodes.length, icon: Globe, color: 'text-olive-600 dark:text-olive-400' },
    { label: 'Cities', value: data.cityCount, icon: MapPin, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Photos', value: data.photoCount, icon: Camera, color: 'text-sky-600 dark:text-sky-400' },
    {
      label: 'Distance',
      value: data.totalDistanceKm >= 10000
        ? `${(data.totalDistanceKm / 1000).toFixed(1)}k`
        : data.totalDistanceKm.toLocaleString(),
      suffix: 'km',
      icon: Route,
      color: 'text-amber-600 dark:text-amber-400',
    },
  ]

  const displayName = profile?.display_name || profile?.username || 'Traveler'
  const avatarUrl = getPhotoUrl(profile?.avatar_url) || undefined

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Hero Header */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(0)}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-olive-700 via-olive-800 to-olive-950 p-6 sm:p-8 text-white mb-6"
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-8 size-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 sm:size-20 ring-2 ring-white/30 shadow-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-olive-600 text-white text-xl sm:text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading">
                {displayName}
              </h1>
              <p className="text-olive-200 text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                <Compass className="size-4" />
                Travel Passport
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-white/80 hover:text-white hover:bg-white/10 shrink-0"
          >
            <Share2 className="size-5" />
          </Button>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Globe Coverage Ring */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(1)}
        className="flex justify-center mb-6"
      >
        <Card className="w-full border-olive-200/50 dark:border-white/[0.08]">
          <CardContent className="flex flex-col items-center py-6">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
              Globe Coverage
            </h2>
            <GlobeCoverageRing percentage={globePercentage} />
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">
              {data.countryCodes.length} of 195 countries explored
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Key Stats Grid */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(2)}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-olive-200/50 dark:border-white/[0.08]"
          >
            <CardContent className="flex flex-col items-center py-5 px-3">
              <stat.icon className={cn('size-6 mb-2', stat.color)} />
              <span className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-stone-500 dark:text-stone-400 ml-0.5">
                    {stat.suffix}
                  </span>
                )}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {stat.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Travel Personality */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(3)}
        className="mb-6"
      >
        <Card className="border-olive-200/50 dark:border-white/[0.08] overflow-hidden">
          <div className="bg-gradient-to-r from-olive-50 to-olive-100 dark:from-olive-950/40 dark:to-olive-900/30 px-6 py-5">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
              Travel Personality
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{data.personality.emoji}</span>
              <div>
                <h3 className="text-xl font-bold text-olive-800 dark:text-olive-200 font-heading">
                  {data.personality.type}
                </h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  {data.personality.description}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Continent Progress */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(4)}
        className="mb-6"
      >
        <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 px-1">
          Continent Progress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.continentProgress.map((cont) => {
            const pct = cont.total > 0 ? (cont.visited / cont.total) * 100 : 0
            return (
              <Card
                key={cont.name}
                className="border-olive-200/50 dark:border-white/[0.08]"
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {cont.name}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {cont.visited}/{cont.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-olive-500 dark:bg-olive-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.max(pct, cont.visited > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Country Passport Strip */}
      {/* ------------------------------------------------------------------ */}
      {data.countryCodes.length > 0 && (
        <motion.div
          {...fadeUpProps(5)}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 px-1">
            Countries Visited
          </h2>
          <Card className="border-olive-200/50 dark:border-white/[0.08]">
            <CardContent className="py-4 px-2">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-600">
                {data.countryCodes.map((code) => (
                  <div
                    key={code}
                    className="flex flex-col items-center gap-1.5 shrink-0 min-w-[60px]"
                  >
                    <span className="text-3xl">{getFlag(code)}</span>
                    <span className="text-[10px] sm:text-xs text-stone-600 dark:text-stone-400 text-center leading-tight max-w-[64px] truncate">
                      {countryNames[code] || code}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Travel Timeline */}
      {/* ------------------------------------------------------------------ */}
      {(data.firstTrip || data.latestTrip) && (
        <motion.div
          {...fadeUpProps(6)}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 px-1">
            Travel Timeline
          </h2>
          <Card className="border-olive-200/50 dark:border-white/[0.08]">
            <CardContent className="py-5 px-5">
              <div className="flex flex-col gap-4">
                {data.firstTrip && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-10 rounded-full bg-olive-100 dark:bg-olive-900/50 shrink-0">
                      <Plane className="size-4 text-olive-600 dark:text-olive-400" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        First Adventure
                      </p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {data.firstTrip.location}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {new Date(data.firstTrip.date).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {data.firstTrip && data.latestTrip && (
                  <div className="border-l-2 border-dashed border-olive-200 dark:border-olive-800 ml-5 h-4" />
                )}
                {data.latestTrip && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                      <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        Latest Adventure
                      </p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {data.latestTrip.location}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {new Date(data.latestTrip.date).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. Share Section */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...fadeUpProps(7)}
      >
        <Card className="border-olive-200/50 dark:border-white/[0.08] bg-gradient-to-br from-olive-50 to-stone-50 dark:from-olive-950/30 dark:to-stone-950/30">
          <CardContent className="py-6 flex flex-col items-center text-center">
            <Share2 className="size-8 text-olive-600 dark:text-olive-400 mb-3" />
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200 font-heading">
              Share Your Passport
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-5 max-w-xs">
              Show off your travel identity. Share your passport with friends and fellow explorers.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy Link
                  </>
                )}
              </Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="size-4" />
                  Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
