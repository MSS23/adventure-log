'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { Globe, MapPin } from 'lucide-react'
import { log } from '@/lib/utils/logger'

// Consistent color palette — each friend gets a unique color
const FRIEND_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
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

// Convert lat/lng to SVG coordinates (equirectangular projection)
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * 800,
    y: ((90 - lat) / 180) * 400,
  }
}

function getFriendColor(userId: string, friendIds: string[]): string {
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
        // Get IDs of people I follow
        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id)
          .eq('status', 'accepted')

        if (followsError || !follows?.length) {
          if (!cancelled) setIsLoading(false)
          return
        }

        const friendIds = follows.map(f => f.following_id)

        // Get 10 most recent albums with coordinates from friends
        const { data, error } = await supabase
          .from('albums')
          .select(`
            id, title, location_name, latitude, longitude, created_at,
            users!albums_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .in('user_id', friendIds)
          .eq('visibility', 'public')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          log.error('Error fetching friends albums', { component: 'FriendsMapSection' }, error)
          if (!cancelled) setIsLoading(false)
          return
        }

        if (cancelled) return

        // Normalize: Supabase FK join returns a single object (not array)
        const normalized: FriendAlbum[] = []
        for (const album of data || []) {
          const userData = album.users as unknown as FriendAlbum['user'] | null
          if (userData && album.latitude != null && album.longitude != null) {
            normalized.push({
              id: album.id,
              title: album.title,
              location_name: album.location_name,
              latitude: album.latitude,
              longitude: album.longitude,
              created_at: album.created_at,
              user: userData,
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

  // Unique friend IDs in order of appearance
  const friendIds = useMemo(() => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const album of albums) {
      if (!seen.has(album.user.id)) {
        seen.add(album.user.id)
        ids.push(album.user.id)
      }
    }
    return ids
  }, [albums])

  // Legend entries
  const friendLegend = useMemo(() => {
    return friendIds.map(id => {
      const album = albums.find(a => a.user.id === id)!
      return {
        id,
        username: album.user.username,
        displayName: album.user.display_name || album.user.username,
        avatarUrl: album.user.avatar_url,
        color: getFriendColor(id, friendIds),
        count: albums.filter(a => a.user.id === id).length,
      }
    })
  }, [friendIds, albums])

  const handlePinClick = useCallback((albumId: string) => {
    router.push(`/albums/${albumId}`)
  }, [router])

  const handleFriendClick = useCallback((friendId: string) => {
    router.push(`/profile/${friendId}`)
  }, [router])

  // Loading skeleton
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400">
            <Globe className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Friends&apos; Adventures
          </h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden animate-pulse">
          <div className="h-[200px] bg-stone-100 dark:bg-stone-800" />
          <div className="px-4 py-3 flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 w-20 rounded-full bg-stone-100 dark:bg-stone-800" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Nothing to show — don't render at all (no orphaned header)
  if (!user || albums.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section header (self-contained) */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-1.5 rounded-lg bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400">
          <Globe className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
          Friends&apos; Adventures
        </h2>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden">
        {/* SVG World Map with Pins */}
        <div className="relative bg-stone-50 dark:bg-[#0a0a0a] px-2 pt-4 pb-2">
          <svg viewBox="0 0 800 400" className="w-full h-auto" style={{ maxHeight: '220px' }}>
            {/* Simplified world landmasses */}
            <g fill="none" stroke="currentColor" className="text-stone-200 dark:text-stone-800" strokeWidth="0.8">
              <path d="M120,80 L130,60 L160,50 L200,55 L220,70 L230,90 L225,120 L210,140 L195,155 L180,170 L160,180 L140,175 L130,160 L120,140 L110,120 L105,100Z" />
              <path d="M160,180 L165,195 L170,210 L165,220 L155,215 L150,200 L155,190Z" />
              <path d="M190,220 L210,215 L230,225 L240,250 L245,280 L235,310 L220,340 L200,360 L185,350 L175,320 L170,290 L175,260 L180,240Z" />
              <path d="M370,60 L380,50 L400,55 L420,60 L430,70 L425,85 L415,95 L405,100 L390,105 L380,100 L370,90 L365,75Z" />
              <path d="M370,120 L390,115 L410,120 L430,130 L440,160 L445,200 L440,240 L425,270 L410,290 L390,300 L375,290 L365,260 L360,230 L355,200 L358,170 L365,140Z" />
              <path d="M430,50 L480,40 L530,35 L580,40 L630,50 L660,60 L670,80 L665,100 L650,120 L630,130 L600,135 L570,130 L540,120 L510,115 L480,110 L460,100 L445,85 L435,70Z" />
              <path d="M530,130 L545,140 L550,160 L545,185 L535,200 L520,195 L515,175 L518,155 L525,140Z" />
              <path d="M590,145 L610,140 L625,150 L630,170 L620,185 L605,180 L595,165Z" />
              <path d="M620,270 L660,260 L700,265 L720,280 L715,310 L695,325 L665,330 L640,320 L625,300 L620,285Z" />
              <path d="M365,60 L370,55 L375,60 L372,68 L367,65Z" />
              <path d="M670,85 L675,75 L680,85 L678,95 L672,92Z" />
            </g>

            {/* Friend pins — use native SVG events, not Next.js Link */}
            {albums.map((album) => {
              const { x, y } = geoToSvg(album.latitude, album.longitude)
              const color = getFriendColor(album.user.id, friendIds)
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
                  {/* Outer glow */}
                  <circle cx={x} cy={y} r={isHovered ? 12 : 8} fill={color} opacity={0.15} />
                  {/* Pin dot */}
                  <circle cx={x} cy={y} r={isHovered ? 6 : 4.5} fill={color} stroke="white" strokeWidth={1.5} />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g pointerEvents="none">
                      <rect
                        x={Math.max(0, Math.min(x - 60, 680))}
                        y={y - 32}
                        width={120}
                        height={22}
                        rx={6}
                        fill="rgba(0,0,0,0.85)"
                      />
                      <text
                        x={Math.max(60, Math.min(x, 740))}
                        y={y - 17}
                        textAnchor="middle"
                        fill="white"
                        fontSize="9"
                        fontWeight="500"
                        fontFamily="system-ui, sans-serif"
                      >
                        {(album.location_name || album.title).slice(0, 22)}
                        {(album.location_name || album.title).length > 22 ? '…' : ''}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Friend Legend */}
        <div className="px-4 py-3 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0 mr-1" />
          {friendLegend.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleFriendClick(friend.id)}
              className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors group"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: friend.color }}
              />
              <Avatar className="h-5 w-5">
                <AvatarImage src={getAvatarUrl(friend.avatarUrl, friend.username)} />
                <AvatarFallback className="text-[8px] bg-stone-100 dark:bg-stone-800">
                  {friend.displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors whitespace-nowrap">
                {friend.displayName}
              </span>
              {friend.count > 1 && (
                <span className="text-[10px] text-stone-400 dark:text-stone-500">
                  ({friend.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
