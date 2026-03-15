'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { MapPin } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// Consistent color palette for friends — each friend gets a unique color
const FRIEND_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
]

interface FriendAlbum {
  id: string
  title: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

// Convert lat/lng to SVG viewBox coordinates (equirectangular projection)
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  // Map lng -180..180 → 0..800, lat 90..-90 → 0..400
  const x = ((lng + 180) / 360) * 800
  const y = ((90 - lat) / 180) * 400
  return { x, y }
}

// Deterministic color assignment based on user ID position in the friend list
function getFriendColor(userId: string, friendIds: string[]): string {
  const idx = friendIds.indexOf(userId)
  return FRIEND_COLORS[idx % FRIEND_COLORS.length]
}

export function FriendsMapSection() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<FriendAlbum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }

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
          setIsLoading(false)
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
          setIsLoading(false)
          return
        }

        // Normalize the user relation
        const normalized = (data || []).map(album => ({
          ...album,
          user: Array.isArray(album.users) ? album.users[0] : album.users,
        })) as unknown as FriendAlbum[]

        setAlbums(normalized.filter(a => a.user && a.latitude && a.longitude))
      } catch (err) {
        log.error('Failed to fetch friends map data', { component: 'FriendsMapSection' }, err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFriendsAlbums()
  }, [user])

  // Unique friends in order of appearance
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

  // Group by friend for the legend
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

  if (!user || isLoading) {
    if (isLoading) {
      return (
        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden animate-pulse">
          <div className="h-[220px] bg-stone-100 dark:bg-stone-800" />
          <div className="p-4 flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-stone-100 dark:bg-stone-800" />
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  if (albums.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.06] overflow-hidden"
    >
      {/* SVG World Map with Pins */}
      <div className="relative bg-stone-50 dark:bg-[#0a0a0a] px-2 pt-4 pb-2">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-auto"
          style={{ maxHeight: '220px' }}
        >
          {/* Simplified world map outline — major landmasses */}
          <g fill="none" stroke="currentColor" className="text-stone-200 dark:text-stone-800" strokeWidth="0.8">
            {/* North America */}
            <path d="M120,80 L130,60 L160,50 L200,55 L220,70 L230,90 L225,120 L210,140 L195,155 L180,170 L160,180 L140,175 L130,160 L120,140 L110,120 L105,100Z" />
            {/* Central America */}
            <path d="M160,180 L165,195 L170,210 L165,220 L155,215 L150,200 L155,190Z" />
            {/* South America */}
            <path d="M190,220 L210,215 L230,225 L240,250 L245,280 L235,310 L220,340 L200,360 L185,350 L175,320 L170,290 L175,260 L180,240Z" />
            {/* Europe */}
            <path d="M370,60 L380,50 L400,55 L420,60 L430,70 L425,85 L415,95 L405,100 L390,105 L380,100 L370,90 L365,75Z" />
            {/* Africa */}
            <path d="M370,120 L390,115 L410,120 L430,130 L440,160 L445,200 L440,240 L425,270 L410,290 L390,300 L375,290 L365,260 L360,230 L355,200 L358,170 L365,140Z" />
            {/* Asia */}
            <path d="M430,50 L480,40 L530,35 L580,40 L630,50 L660,60 L670,80 L665,100 L650,120 L630,130 L600,135 L570,130 L540,120 L510,115 L480,110 L460,100 L445,85 L435,70Z" />
            {/* India */}
            <path d="M530,130 L545,140 L550,160 L545,185 L535,200 L520,195 L515,175 L518,155 L525,140Z" />
            {/* Southeast Asia */}
            <path d="M590,145 L610,140 L625,150 L630,170 L620,185 L605,180 L595,165Z" />
            {/* Australia */}
            <path d="M620,270 L660,260 L700,265 L720,280 L715,310 L695,325 L665,330 L640,320 L625,300 L620,285Z" />
            {/* UK/Ireland */}
            <path d="M365,60 L370,55 L375,60 L372,68 L367,65Z" />
            {/* Japan */}
            <path d="M670,85 L675,75 L680,85 L678,95 L672,92Z" />
          </g>

          {/* Friend pins */}
          {albums.map((album) => {
            const { x, y } = geoToSvg(album.latitude!, album.longitude!)
            const color = getFriendColor(album.user.id, friendIds)
            const isHovered = hoveredPin === album.id
            return (
              <Link key={album.id} href={`/albums/${album.id}`}>
                <g
                  onMouseEnter={() => setHoveredPin(album.id)}
                  onMouseLeave={() => setHoveredPin(null)}
                  className="cursor-pointer"
                >
                  {/* Outer glow */}
                  <circle
                    cx={x} cy={y}
                    r={isHovered ? 12 : 8}
                    fill={color}
                    opacity={0.15}
                    className="transition-all duration-200"
                  />
                  {/* Pin dot */}
                  <circle
                    cx={x} cy={y}
                    r={isHovered ? 6 : 4.5}
                    fill={color}
                    stroke="white"
                    strokeWidth={1.5}
                    className="transition-all duration-200"
                  />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={x - 60} y={y - 32}
                        width={120} height={22}
                        rx={6}
                        fill="rgba(0,0,0,0.8)"
                      />
                      <text
                        x={x} y={y - 17}
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
              </Link>
            )
          })}
        </svg>
      </div>

      {/* Friend Legend */}
      <div className="px-4 py-3 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0 mr-1" />
        {friendLegend.map((friend) => (
          <Link
            key={friend.id}
            href={`/profile/${friend.id}`}
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
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
