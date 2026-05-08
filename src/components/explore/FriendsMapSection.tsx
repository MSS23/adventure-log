'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { Globe, Users } from 'lucide-react'
import { log } from '@/lib/utils/logger'

// Softer, more professional color palette
const FRIEND_COLORS = [
  { dot: '#6366f1', glow: '#6366f140' }, // indigo
  { dot: '#f59e0b', glow: '#f59e0b40' }, // amber
  { dot: '#10b981', glow: '#10b98140' }, // emerald
  { dot: '#ec4899', glow: '#ec489940' }, // pink
  { dot: '#06b6d4', glow: '#06b6d440' }, // cyan
  { dot: '#f97316', glow: '#f9731640' }, // orange
  { dot: '#8b5cf6', glow: '#8b5cf640' }, // violet
  { dot: '#ef4444', glow: '#ef444440' }, // red
  { dot: '#14b8a6', glow: '#14b8a640' }, // teal
  { dot: '#3b82f6', glow: '#3b82f640' }, // blue
]

interface FriendAlbum {
  id: string
  title: string
  location_name: string | null
  latitude: number
  longitude: number
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * 800,
    y: ((90 - lat) / 180) * 400,
  }
}

function getFriendColorSet(userId: string, friendIds: string[]) {
  const idx = friendIds.indexOf(userId)
  return FRIEND_COLORS[idx % FRIEND_COLORS.length]
}

export function FriendsMapSection() {
  const { user } = useAuth()
  const router = useRouter()
  const [albums, setAlbums] = useState<FriendAlbum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    let cancelled = false

    async function fetchFriendsAlbums() {
      const supabase = createClient()
      try {
        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id)
          .eq('status', 'accepted')

        if (followsError || !follows?.length) {
          if (!cancelled) setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('albums')
          .select(`
            id, title, location_name, latitude, longitude, created_at,
            users!albums_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .in('user_id', follows.map(f => f.following_id))
          .eq('visibility', 'public')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error || cancelled) {
          if (error) log.error('Error fetching friends albums', { component: 'FriendsMapSection' }, error)
          if (!cancelled) setIsLoading(false)
          return
        }

        const normalized: FriendAlbum[] = []
        for (const album of data || []) {
          const userData = album.users as unknown as FriendAlbum['user'] | null
          if (userData && album.latitude != null && album.longitude != null) {
            normalized.push({
              id: album.id, title: album.title, location_name: album.location_name,
              latitude: album.latitude, longitude: album.longitude,
              created_at: album.created_at, user: userData,
            })
          }
        }
        setAlbums(normalized)
      } catch (err) {
        log.error('Failed to fetch friends map data', { component: 'FriendsMapSection' }, err as Error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchFriendsAlbums()
    return () => { cancelled = true }
  }, [user])

  const friendIds = useMemo(() => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const album of albums) {
      if (!seen.has(album.user.id)) { seen.add(album.user.id); ids.push(album.user.id) }
    }
    return ids
  }, [albums])

  const friendLegend = useMemo(() => {
    return friendIds.map(id => {
      const album = albums.find(a => a.user.id === id)!
      return {
        id,
        username: album.user.username,
        displayName: album.user.display_name || album.user.username,
        avatarUrl: album.user.avatar_url,
        colors: getFriendColorSet(id, friendIds),
        count: albums.filter(a => a.user.id === id).length,
      }
    })
  }, [friendIds, albums])

  const hoveredAlbum = useMemo(() => albums.find(a => a.id === hoveredPin), [albums, hoveredPin])

  const handlePinClick = useCallback((albumId: string) => {
    router.push(`/albums/${albumId}`)
  }, [router])

  const handleFriendClick = useCallback((friendId: string) => {
    router.push(`/profile/${friendId}`)
  }, [router])

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="h-4.5 w-4.5 text-olive-500" />
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Friends&apos; Adventures</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden animate-pulse">
          <div className="h-[240px] bg-stone-50 dark:bg-stone-900/50" />
          <div className="px-4 py-3 flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-7 w-7 rounded-full bg-stone-100 dark:bg-stone-800" />)}
          </div>
        </div>
      </section>
    )
  }

  if (!user) return null

  if (albums.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="h-4.5 w-4.5 text-olive-500" />
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Friends&apos; Adventures</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-3 rounded-2xl bg-olive-50 dark:bg-olive-900/20 mb-4">
              <Globe className="h-8 w-8 text-olive-400" />
            </div>
            <p className="text-stone-600 dark:text-stone-300 font-medium mb-1">
              See where your friends are exploring
            </p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-4 max-w-xs">
              Follow other adventurers to see their journeys appear on this map
            </p>
            <button
              onClick={() => router.push('/explore/creators')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-olive-600 hover:bg-olive-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Users className="h-4 w-4" />
              Discover Adventurers
            </button>
          </div>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Globe className="h-4.5 w-4.5 text-olive-500" />
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Friends&apos; Adventures</h2>
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">{albums.length} recent</span>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden shadow-sm">
        {/* Map area */}
        <div className="relative bg-gradient-to-b from-stone-50 to-stone-100/80 dark:from-[#0c0c0c] dark:to-[#0a0a0a]">
          <svg viewBox="0 0 800 400" className="w-full" style={{ height: 'clamp(180px, 28vw, 260px)' }}>
            <defs>
              {/* Subtle grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-stone-200/50 dark:text-stone-800/30" />
              </pattern>
              {/* Glow filter for pins */}
              <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background grid */}
            <rect width="800" height="400" fill="url(#grid)" />

            {/* Continents — filled shapes with soft stroke */}
            <g className="text-stone-300/70 dark:text-stone-700/50" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round">
              {/* North America */}
              <path d="M95,55 L115,38 L148,30 L175,28 L205,35 L225,50 L238,68 L240,88 L232,108 L220,128 L208,145 L195,158 L178,168 L165,178 L155,182 L148,188 L142,196 L138,178 L125,162 L112,138 L100,115 L92,92 L90,72Z" opacity="0.4" />
              {/* Greenland */}
              <path d="M252,25 L270,18 L290,22 L298,35 L292,52 L278,58 L262,50 L254,38Z" opacity="0.35" />
              {/* South America */}
              <path d="M170,218 L182,208 L200,205 L218,210 L232,218 L242,235 L248,260 L250,285 L244,312 L232,335 L218,352 L202,362 L190,358 L182,342 L175,318 L168,290 L165,262 L168,238Z" opacity="0.4" />
              {/* Europe */}
              <path d="M358,48 L372,38 L390,35 L408,40 L425,52 L435,65 L430,82 L422,95 L412,102 L398,108 L385,105 L375,98 L365,88 L355,72 L355,58Z" opacity="0.4" />
              {/* UK */}
              <path d="M348,52 L355,45 L362,50 L360,62 L352,65 L347,58Z" opacity="0.35" />
              {/* Africa */}
              <path d="M368,125 L385,118 L405,122 L425,132 L438,152 L445,178 L448,208 L445,238 L438,262 L425,282 L412,298 L395,305 L380,300 L368,285 L360,258 L355,228 L352,198 L355,168 L360,145Z" opacity="0.4" />
              {/* Asia */}
              <path d="M435,38 L470,28 L510,22 L555,25 L600,32 L640,42 L665,55 L678,72 L675,92 L665,110 L648,125 L628,132 L600,135 L568,130 L538,122 L512,118 L488,112 L465,102 L450,88 L440,72 L435,55Z" opacity="0.4" />
              {/* India */}
              <path d="M528,135 L545,142 L552,162 L548,185 L538,202 L525,198 L518,178 L520,155Z" opacity="0.4" />
              {/* SE Asia */}
              <path d="M588,148 L608,142 L628,152 L635,172 L625,188 L610,182 L598,168Z" opacity="0.35" />
              {/* Japan */}
              <path d="M672,72 L680,62 L688,72 L686,88 L678,92 L672,82Z" opacity="0.35" />
              {/* Australia */}
              <path d="M618,268 L655,258 L695,262 L718,278 L720,302 L708,322 L685,332 L658,335 L638,325 L625,308 L618,288Z" opacity="0.4" />
              {/* NZ */}
              <path d="M738,318 L745,308 L750,318 L748,332 L742,335 L738,325Z" opacity="0.3" />
            </g>

            {/* Connection lines between same-friend pins */}
            {friendIds.map(fId => {
              const friendAlbums = albums.filter(a => a.user.id === fId)
              if (friendAlbums.length < 2) return null
              const color = getFriendColorSet(fId, friendIds)
              return friendAlbums.slice(0, -1).map((a, i) => {
                const from = geoToSvg(a.latitude, a.longitude)
                const to = geoToSvg(friendAlbums[i + 1].latitude, friendAlbums[i + 1].longitude)
                return (
                  <line
                    key={`${a.id}-${friendAlbums[i + 1].id}`}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color.dot} strokeWidth="1" strokeDasharray="4 3" opacity="0.25"
                  />
                )
              })
            })}

            {/* Pins */}
            {albums.map((album) => {
              const { x, y } = geoToSvg(album.latitude, album.longitude)
              const colors = getFriendColorSet(album.user.id, friendIds)
              const isHovered = hoveredPin === album.id
              return (
                <g
                  key={album.id}
                  onMouseEnter={() => setHoveredPin(album.id)}
                  onMouseLeave={() => setHoveredPin(null)}
                  onClick={() => handlePinClick(album.id)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePinClick(album.id) }}
                  aria-label={`${album.location_name || album.title} by ${album.user.display_name || album.user.username}`}
                >
                  {/* Ambient glow */}
                  <circle cx={x} cy={y} r={isHovered ? 14 : 10} fill={colors.glow} className="transition-all duration-300" />
                  {/* White ring */}
                  <circle cx={x} cy={y} r={isHovered ? 6.5 : 5} fill="white" className="transition-all duration-300" />
                  {/* Color dot */}
                  <circle cx={x} cy={y} r={isHovered ? 5 : 3.5} fill={colors.dot} className="transition-all duration-300" />
                </g>
              )
            })}
          </svg>

          {/* Floating tooltip card on hover */}
          {hoveredAlbum && (() => {
            const { x, y } = geoToSvg(hoveredAlbum.latitude, hoveredAlbum.longitude)
            const colors = getFriendColorSet(hoveredAlbum.user.id, friendIds)
            // Position relative to container using percentages
            const leftPct = (x / 800) * 100
            const topPct = (y / 400) * 100
            const alignRight = leftPct > 65
            const alignBottom = topPct < 30
            return (
              <div
                className="absolute pointer-events-none z-10 transition-all duration-200"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: `translate(${alignRight ? '-100%' : '0'}, ${alignBottom ? '12px' : 'calc(-100% - 12px)'})`,
                }}
              >
                <div className="bg-white dark:bg-stone-900 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/40 border border-stone-200/60 dark:border-stone-700/40 px-3 py-2 flex items-center gap-2.5 min-w-[160px]">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: colors.dot }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                      {hoveredAlbum.location_name || hoveredAlbum.title}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                      {hoveredAlbum.user.display_name || hoveredAlbum.user.username}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Friend avatars legend — clean row */}
        <div className="px-4 py-2.5 flex items-center gap-0.5 overflow-x-auto scrollbar-hide border-t border-stone-100 dark:border-white/[0.04]">
          {friendLegend.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleFriendClick(friend.id)}
              className="relative shrink-0 p-1 rounded-full hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors group"
              title={`${friend.displayName} — ${friend.count} trip${friend.count > 1 ? 's' : ''}`}
            >
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 transition-all duration-200 group-hover:ring-[3px]" style={{ ['--tw-ring-color' as string]: friend.colors.dot }}>
                  <AvatarImage src={getAvatarUrl(friend.avatarUrl, friend.username)} />
                  <AvatarFallback className="text-[9px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {friend.displayName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {friend.count > 1 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold text-white flex items-center justify-center leading-none"
                    style={{ backgroundColor: friend.colors.dot }}
                  >
                    {friend.count}
                  </span>
                )}
              </div>
            </button>
          ))}
          <span className="text-[11px] text-stone-400 dark:text-stone-500 ml-auto shrink-0 pl-2">
            {friendIds.length} friend{friendIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </motion.section>
  )
}
