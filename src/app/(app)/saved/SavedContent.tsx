'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { Bookmark, Compass, MapPin, Camera, Heart, User, Users, Globe, ChevronDown, ChevronRight, LayoutGrid, FolderOpen, Filter, TrendingUp, X } from 'lucide-react'
import { NoSavedEmptyState } from '@/components/ui/enhanced-empty-state'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getCountryName, extractCountryFromLocation, getFlagEmoji } from '@/lib/utils/country'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorRetryState } from '@/components/ui/error-retry-state'
import SavedLoading from './loading'

export interface SavedAlbum {
  id: string
  title: string
  cover_photo_url: string | null
  location_name: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  user_id: string
  user: {
    username: string
    display_name: string
    avatar_url: string | null
  } | null
  savedAt: string
  popularity: number
}

type SortMode = 'recent' | 'popular' | 'username' | 'location'
type ViewMode = 'grid' | 'collections'
type GroupBy = 'location' | 'username'

interface CollectionGroup {
  key: string
  label: string
  flag?: string
  /** Uppercase ISO country code, when this group is a country. Used as a
   *  readable, neutral-toned fallback chip on platforms (e.g. Windows) that
   *  render the regional-indicator flag emoji as bare letters. */
  code?: string
  albums: SavedAlbum[]
}

// Fetches the saved-albums waterfall client-side (favorites -> albums ->
// popularity) and maps to SavedAlbum[]. Mirrors the previous server fetch
// exactly so behavior is unchanged; React Query (5min staleTime +
// refetchOnMount:false from QueryProvider) now owns the cache, so revisiting
// via the sidebar repaints from cache instead of doing an RSC round-trip.
async function fetchSavedAlbums(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<SavedAlbum[]> {
  // Fetch user's favorited albums
  const { data: favorites, error: favError } = await supabase
    .from('likes')
    .select('target_id, created_at')
    .eq('user_id', userId)
    .eq('target_type', 'album')
    .order('created_at', { ascending: false })

  if (favError) {
    log.error('Error fetching favorites', {
      component: 'SavedContent',
      action: 'client-fetch-favorites',
      userId,
    }, favError)
    throw favError
  }

  if (!favorites || favorites.length === 0) {
    return []
  }

  // Fetch album details for each favorite
  const albumIds = favorites.map(f => f.target_id)
  const { data: albums, error: albumError } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      cover_photo_url,
      location_name,
      country_code,
      latitude,
      longitude,
      user_id,
      users:user_id (
        username,
        display_name,
        avatar_url
      )
    `)
    .in('id', albumIds)

  if (albumError) {
    log.error('Error fetching saved album details', {
      component: 'SavedContent',
      action: 'client-fetch-albums',
      userId,
    }, albumError)
    throw albumError
  }

  // Fetch like counts for popularity in one query, tallied in memory.
  // No denormalized count column exists, so we aggregate from the `likes` table
  // (same source the Explore feed scores against). target_id stores album ids as text.
  const popularityByAlbum = new Map<string, number>()
  const { data: likeRows, error: likeCountError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('target_type', 'album')
    .in('target_id', albumIds)

  if (likeCountError) {
    log.error('Error fetching saved album popularity', {
      component: 'SavedContent',
      action: 'client-fetch-like-counts',
      userId,
    }, likeCountError)
  } else {
    for (const row of likeRows || []) {
      popularityByAlbum.set(row.target_id, (popularityByAlbum.get(row.target_id) || 0) + 1)
    }
  }

  // Map albums to SavedAlbum shape with savedAt timestamps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (albums || []).map((album: any) => ({
    id: album.id,
    title: album.title,
    cover_photo_url: album.cover_photo_url,
    location_name: album.location_name,
    country_code: album.country_code,
    latitude: album.latitude,
    longitude: album.longitude,
    user_id: album.user_id,
    user: album.users,
    savedAt: favorites.find(f => f.target_id === album.id)?.created_at || '',
    popularity: popularityByAlbum.get(album.id) || 0,
  }))
}

export default function SavedContent() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { user } = useAuth()
  const userId = user?.id
  const supabase = useMemo(() => createClient(), [])
  const { removeFavorite } = useFavorites({
    targetType: 'album',
    autoFetch: false
  })

  // React Query owns the saved-albums cache (5min staleTime +
  // refetchOnMount:false from QueryProvider), so navigating away and back
  // repaints from cache instead of re-running the favorites -> albums ->
  // popularity waterfall behind a skeleton.
  const { data: queryAlbums, isPending, isError, refetch } = useQuery({
    queryKey: ['saved-albums', userId],
    enabled: !!userId,
    queryFn: () => fetchSavedAlbums(supabase, userId!),
  })

  // Local mirror so the remove-from-saved interaction can optimistically drop a
  // card without waiting on a refetch (preserves the original behavior).
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([])
  useEffect(() => {
    if (queryAlbums) setSavedAlbums(queryAlbums)
  }, [queryAlbums])
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [groupBy, setGroupBy] = useState<GroupBy>('location')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // Filters: narrow the visible set by who saved-from and where. Built from the
  // saved set itself so we only ever offer users/countries that actually appear.
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterCountry, setFilterCountry] = useState<string>('all')

  const hasActiveFilters = filterUser !== 'all' || filterCountry !== 'all'
  const clearFilters = () => {
    setFilterUser('all')
    setFilterCountry('all')
  }

  // Handle removing an album from saved
  const handleRemove = async (albumId: string) => {
    await removeFavorite(albumId, 'album')
    setSavedAlbums(prev => prev.filter(a => a.id !== albumId))
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter options derived from the saved set (only surface what's present)
  const userOptions = useMemo(() => {
    const map = new Map<string, { username: string; label: string }>()
    for (const album of savedAlbums) {
      const username = album.user?.username
      if (!username || map.has(username)) continue
      map.set(username, { username, label: album.user?.display_name || `@${username}` })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [savedAlbums])

  const countryOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; flag?: string }>()
    for (const album of savedAlbums) {
      const code = album.country_code?.toUpperCase()
      const label = getCountryLabel(album)
      const key = code || label.toLowerCase()
      if (map.has(key)) continue
      map.set(key, { key, label, flag: code ? getFlagEmoji(code) : undefined })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [savedAlbums])

  // Apply active filters before sorting / grouping
  const filteredAlbums = useMemo(() => {
    return savedAlbums.filter((album) => {
      if (filterUser !== 'all' && album.user?.username !== filterUser) return false
      if (filterCountry !== 'all') {
        const code = album.country_code?.toUpperCase()
        const key = code || getCountryLabel(album).toLowerCase()
        if (key !== filterCountry) return false
      }
      return true
    })
  }, [savedAlbums, filterUser, filterCountry])

  // Sort albums based on selected mode
  const sortedAlbums = useMemo(() => {
    const sorted = [...filteredAlbums]
    switch (sortMode) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      case 'popular':
        return sorted.sort((a, b) => {
          if (b.popularity !== a.popularity) return b.popularity - a.popularity
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        })
      case 'username':
        return sorted.sort((a, b) => {
          const nameA = a.user?.display_name || a.user?.username || ''
          const nameB = b.user?.display_name || b.user?.username || ''
          return nameA.localeCompare(nameB)
        })
      case 'location':
        return sorted.sort((a, b) => {
          const locA = getCountryLabel(a)
          const locB = getCountryLabel(b)
          return locA.localeCompare(locB)
        })
      default:
        return sorted
    }
  }, [filteredAlbums, sortMode])

  // Auto-collections: group albums by country or username
  const collections = useMemo((): CollectionGroup[] => {
    const groups = new Map<string, CollectionGroup>()

    for (const album of filteredAlbums) {
      let key: string
      let label: string
      let flag: string | undefined
      let code: string | undefined

      if (groupBy === 'location') {
        const countryName = getCountryLabel(album)
        code = album.country_code?.toUpperCase()
        key = code || countryName.toLowerCase()
        label = countryName
        flag = code ? getFlagEmoji(code) : undefined
      } else {
        const username = album.user?.username || 'unknown'
        key = username
        label = album.user?.display_name || `@${username}`
      }

      if (!groups.has(key)) {
        groups.set(key, { key, label, flag, code, albums: [] })
      }
      groups.get(key)!.albums.push(album)
    }

    // Sort groups by album count (largest first), then alphabetically
    return Array.from(groups.values()).sort((a, b) => {
      if (b.albums.length !== a.albums.length) return b.albums.length - a.albums.length
      return a.label.localeCompare(b.label)
    })
  }, [filteredAlbums, groupBy])

  // Show the same skeleton the route-level loading.tsx used while the initial
  // query is in flight (or before the user id is known).
  if (isPending || !userId) {
    return <SavedLoading />
  }

  // A failed fetch must not fall through to "0 albums saved" — that's a lie
  // when the user has saved albums but the request errored.
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-6xl py-10">
        <ErrorRetryState
          title="Couldn’t load your saved albums"
          description="We couldn’t reach the server. Your saved albums are safe — try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          eyebrow="Library"
          title="Saved"
          subtitle={
            <>
              Albums you bookmarked · {savedAlbums.length}
              {viewMode === 'collections' && ` · ${collections.length} collection${collections.length !== 1 ? 's' : ''}`}
            </>
          }
          actions={
            <Link href="/explore" className="shrink-0">
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                <Compass className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Explore</span>
              </Button>
            </Link>
          }
        />

        {/* Empty State */}
        {savedAlbums.length === 0 ? (
          <NoSavedEmptyState onExplore={() => router.push('/explore')} />
        ) : (
          <>
            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('collections')}
                  aria-label="Collections view"
                  aria-pressed={viewMode === 'collections'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
                    viewMode === 'collections'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Collections</span>
                </button>
              </div>

              {/* Sort / Group By */}
              {viewMode === 'grid' ? (
                <Select value={sortMode} onValueChange={(v: SortMode) => setSortMode(v)}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">
                      <span className="flex items-center gap-2"><Bookmark className="h-3.5 w-3.5" /> Recently Saved</span>
                    </SelectItem>
                    <SelectItem value="popular">
                      <span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Most Popular</span>
                    </SelectItem>
                    <SelectItem value="username">
                      <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> By User</span>
                    </SelectItem>
                    <SelectItem value="location">
                      <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> By Location</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={groupBy} onValueChange={(v: GroupBy) => setGroupBy(v)}>
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="location">
                      <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> By Country</span>
                    </SelectItem>
                    <SelectItem value="username">
                      <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> By User</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Filter Bar — only render filters that have something to choose from */}
            {(userOptions.length > 1 || countryOptions.length > 1) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </span>

                {/* By User */}
                {userOptions.length > 1 && (
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-[160px] h-9">
                      <span className="flex items-center gap-2 truncate">
                        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="All users" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      {userOptions.map((u) => (
                        <SelectItem key={u.username} value={u.username}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* By Country */}
                {countryOptions.length > 1 && (
                  <Select value={filterCountry} onValueChange={setFilterCountry}>
                    <SelectTrigger className="w-[180px] h-9">
                      <span className="flex items-center gap-2 truncate">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="All countries" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countryOptions.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          <span className="flex items-center gap-2">
                            {c.flag && (
                              <span className="text-foreground" role="img" aria-label={c.label}>{c.flag}</span>
                            )}
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}

                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {filteredAlbums.length} shown
                </span>
              </div>
            )}

            {/* No albums match the active filters */}
            {filteredAlbums.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                <Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="mb-4 text-sm text-muted-foreground">
                  No saved albums match these filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">
                  Clear filters
                </Button>
              </div>
            ) : (
            <>

            {/* Flat Grid View */}
            {viewMode === 'grid' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={sortMode}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                  }}
                >
                  {sortedAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      onRemove={handleRemove}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Collections View */}
            {viewMode === 'collections' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={groupBy}
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {collections.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.key)

                    return (
                      <motion.div
                        key={group.key}
                        className="rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-resting)]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        {/* Collection Header */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          aria-expanded={!isCollapsed}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            {group.flag ? (
                              // Neutral chip so that platforms which can't render the
                              // regional-indicator flag emoji (notably Windows, where
                              // 🇯🇵 degrades to bare "JP" letters) show those letters in
                              // readable text-foreground on a muted background — never
                              // the low-contrast green/primary token they had before.
                              <span
                                className="flex h-8 min-w-8 items-center justify-center rounded-full bg-muted px-1.5 text-xl leading-none text-foreground"
                                role="img"
                                aria-label={group.label}
                                title={group.label}
                              >
                                {group.flag}
                              </span>
                            ) : groupBy === 'username' ? (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                              </div>
                            )}
                            <div className="text-left">
                              <h3 className="font-heading font-semibold text-foreground">
                                {group.label}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {group.albums.length} album{group.albums.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>

                        {/* Collection Albums */}
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {group.albums.map((album) => (
                                  <AlbumCard
                                    key={album.id}
                                    album={album}
                                    onRemove={handleRemove}
                                    prefersReducedMotion={prefersReducedMotion}
                                    compact
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            )}
            </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCountryLabel(album: SavedAlbum): string {
  if (album.country_code) {
    // Prefer the full, human-readable country name. We deliberately do NOT
    // fall back to the bare 2-letter code here — a raw "JP"/"US" as a label
    // reads as an unreadable token in the group header. If the code can't be
    // resolved to a name, fall through to the location-derived label instead,
    // and the flag emoji (rendered alongside) still carries the country.
    const name = getCountryName(album.country_code)
    if (name) return name
  }
  if (album.location_name) {
    return extractCountryFromLocation(album.location_name)
  }
  // Last resort: show the code in a neutral, readable tone (the caller renders
  // group.label inside a text-foreground heading, never a green/primary token).
  return album.country_code ? album.country_code.toUpperCase() : 'Unknown Location'
}

// ─── Album Card Component ────────────────────────────────────────────────────

function AlbumCard({
  album,
  onRemove,
  prefersReducedMotion,
  compact = false
}: {
  album: SavedAlbum
  onRemove: (id: string) => void
  prefersReducedMotion: boolean
  compact?: boolean
}) {
  return (
    <motion.div
      className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-resting)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[var(--shadow-hover)]"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
    >
      <Link
        href={`/albums/${album.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      >
        {/* Album Cover */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "aspect-square" : "aspect-[4/3]"
        )}>
          {album.cover_photo_url ? (
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes={compact ? "(max-width: 640px) 50vw, 25vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Country flag badge — wrapped in a translucent chip so that
              platforms which can't render the regional-indicator flag emoji
              (notably Windows, where 🇯🇵 degrades to bare "JP" letters) show
              those letters in legible white on a dark backdrop instead of
              unreadable dark glyphs over the photo. */}
          {album.country_code && (
            <span
              className="absolute top-2 left-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/55 px-1.5 text-base leading-none text-white shadow-sm ring-1 ring-white/15 backdrop-blur-md"
              role="img"
              aria-label={getCountryName(album.country_code) || album.country_code.toUpperCase()}
              title={getCountryName(album.country_code) || album.country_code.toUpperCase()}
            >
              {getFlagEmoji(album.country_code.toUpperCase())}
            </span>
          )}

          {/* Popularity badge (total likes) */}
          {album.popularity > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-[var(--shadow-overlay)] backdrop-blur-sm">
              <Heart className="h-3 w-3 fill-[currentColor] text-accent" />
              <span className="tabular-nums">{album.popularity}</span>
            </div>
          )}
        </div>

        {/* Album Info */}
        <div className={cn(compact ? "p-3" : "p-4")}>
          <h3 className={cn(
            "font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors",
            compact ? "text-sm mb-0.5" : "mb-1"
          )}>
            {album.title}
          </h3>

          {album.location_name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{album.location_name}</span>
            </div>
          )}

          {!compact && album.user && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {album.user.display_name || album.user.username}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Remove-from-saved toggle — a clean translucent chip that mirrors the
          flag badge in the opposite corner. Filled = saved; the heart shifts to
          a soft red on hover to signal it will be removed. */}
      <div className="absolute top-2 right-2 z-10">
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(album.id)
          }}
          className={cn(
            "group/heart grid h-8 w-8 place-items-center rounded-full cursor-pointer",
            "bg-black/45 text-white shadow-sm ring-1 ring-white/15 backdrop-blur-md",
            "hover:bg-black/65 hover:scale-105 active:scale-[0.95]",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          title="Remove from saved"
          aria-label="Remove from saved"
        >
          <Heart className="h-4 w-4 fill-current transition-colors duration-200 group-hover/heart:text-red-400" />
        </motion.button>
      </div>
    </motion.div>
  )
}
