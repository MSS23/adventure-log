'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { Globe, Users } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { localizePath } from '@/lib/utils/native-routes'
import { WORLD_DOTS } from './world-map-dots'

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
    router.push(localizePath(`/albums/${albumId}`))
  }, [router])

  const handleFriendClick = useCallback((friendId: string) => {
    router.push(localizePath(`/profile/${friendId}`))
  }, [router])

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="h-4.5 w-4.5 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Friends&apos; Adventures</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Skeleton className="h-[240px] w-full rounded-none" />
          <div className="px-4 py-3 flex gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-7 w-7 rounded-full" />)}
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
          <Globe className="h-4.5 w-4.5 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Friends&apos; Adventures</h2>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Globe className="h-6 w-6" />
          </div>
          <p className="font-heading text-lg font-semibold text-foreground">
            See where your friends are exploring
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Follow other adventurers to see their journeys appear on this map
          </p>
          <Button onClick={() => router.push('/explore/creators')} className="mt-5">
            <Users className="h-4 w-4" />
            Discover Adventurers
          </Button>
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
        <Globe className="h-4.5 w-4.5 text-primary" />
        <h2 className="font-heading text-base font-semibold text-foreground">Friends&apos; Adventures</h2>
        <span className="font-mono text-[11px] tracking-wide uppercase text-muted-foreground ml-auto">{albums.length} recent</span>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Map area */}
        <div className="relative bg-muted/40">
          <svg viewBox="0 0 800 400" className="w-full" style={{ height: 'clamp(180px, 28vw, 260px)' }}>
            {/* Dotted world map — real land sampled on the same equirectangular
                projection as the pins, so dots and pins line up exactly. */}
            <g className="text-foreground/25" fill="currentColor">
              {Array.from({ length: WORLD_DOTS.length / 2 }, (_, i) => (
                <circle key={i} cx={WORLD_DOTS[i * 2]} cy={WORLD_DOTS[i * 2 + 1]} r={1.6} />
              ))}
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
                <div className="flex min-w-[160px] items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: colors.dot }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {hoveredAlbum.location_name || hoveredAlbum.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {hoveredAlbum.user.display_name || hoveredAlbum.user.username}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Friend avatars legend — clean row */}
        <div className="px-4 py-2.5 flex items-center gap-0.5 overflow-x-auto scrollbar-hide border-t border-border">
          {friendLegend.map((friend) => (
            <button
              type="button"
              key={friend.id}
              onClick={() => handleFriendClick(friend.id)}
              className="relative shrink-0 flex items-center justify-center min-h-11 min-w-11 p-1 rounded-full hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] group"
              aria-label={`${friend.displayName}, ${friend.count} trip${friend.count > 1 ? 's' : ''}`}
              title={`${friend.displayName} — ${friend.count} trip${friend.count > 1 ? 's' : ''}`}
            >
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 transition-all duration-200 group-hover:ring-[3px]" style={{ ['--tw-ring-color' as string]: friend.colors.dot }}>
                  <AvatarImage src={getAvatarUrl(friend.avatarUrl, friend.username)} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-medium">
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
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground ml-auto shrink-0 pl-2">
            {friendIds.length} friend{friendIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </motion.section>
  )
}
