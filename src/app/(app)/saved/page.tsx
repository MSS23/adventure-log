'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Loader2, Bookmark, Compass, MapPin, Camera, Heart, User, Globe, ChevronDown, ChevronRight, LayoutGrid, FolderOpen } from 'lucide-react'
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
import { getCountryName, extractCountryFromLocation } from '@/lib/utils/country'

interface SavedAlbum {
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
}

type SortMode = 'recent' | 'username' | 'location'
type ViewMode = 'grid' | 'collections'
type GroupBy = 'location' | 'username'

interface CollectionGroup {
  key: string
  label: string
  flag?: string
  albums: SavedAlbum[]
}

export default function SavedPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { favorites, loading: favoritesLoading, removeFavorite } = useFavorites({
    targetType: 'album',
    autoFetch: true
  })
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [groupBy, setGroupBy] = useState<GroupBy>('location')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const supabase = useMemo(() => createClient(), [])

  const isAuthLoading = authLoading || profileLoading

  // Fetch album details for each favorite
  const fetchAlbumDetails = useCallback(async () => {
    if (!favorites || favorites.length === 0) {
      setSavedAlbums([])
      setLoadingAlbums(false)
      return
    }

    try {
      const albumIds = favorites.map(f => f.target_id)
      const { data: albums, error } = await supabase
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

      if (error) {
        log.error('Error fetching saved albums', { component: 'SavedPage', action: 'fetch' }, error)
        setLoadingAlbums(false)
        return
      }

      if (albums) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: SavedAlbum[] = albums.map((album: any) => ({
          id: album.id,
          title: album.title,
          cover_photo_url: album.cover_photo_url,
          location_name: album.location_name,
          country_code: album.country_code,
          latitude: album.latitude,
          longitude: album.longitude,
          user_id: album.user_id,
          user: album.users,
          savedAt: favorites.find(f => f.target_id === album.id)?.created_at || ''
        }))

        setSavedAlbums(mapped)
      }
    } catch (err) {
      log.error('Error fetching album details', { component: 'SavedPage', action: 'fetch-details' }, err as Error)
    } finally {
      setLoadingAlbums(false)
    }
  }, [favorites, supabase])

  useEffect(() => {
    if (!favoritesLoading) {
      fetchAlbumDetails()
    }
  }, [favoritesLoading, fetchAlbumDetails])

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

  // Sort albums based on selected mode
  const sortedAlbums = useMemo(() => {
    const sorted = [...savedAlbums]
    switch (sortMode) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
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
  }, [savedAlbums, sortMode])

  // Auto-collections: group albums by country or username
  const collections = useMemo((): CollectionGroup[] => {
    const groups = new Map<string, CollectionGroup>()

    for (const album of savedAlbums) {
      let key: string
      let label: string
      let flag: string | undefined

      if (groupBy === 'location') {
        const countryName = getCountryLabel(album)
        const code = album.country_code?.toUpperCase()
        key = code || countryName.toLowerCase()
        label = countryName
        flag = code ? getFlagEmoji(code) : undefined
      } else {
        const username = album.user?.username || 'unknown'
        key = username
        label = album.user?.display_name || `@${username}`
      }

      if (!groups.has(key)) {
        groups.set(key, { key, label, flag, albums: [] })
      }
      groups.get(key)!.albums.push(album)
    }

    // Sort groups by album count (largest first), then alphabetically
    return Array.from(groups.values()).sort((a, b) => {
      if (b.albums.length !== a.albums.length) return b.albums.length - a.albums.length
      return a.label.localeCompare(b.label)
    })
  }, [savedAlbums, groupBy])

  // Not authenticated
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-olive-100 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-olive-500" />
          </div>
          <p className="text-stone-600 mb-4">Please log in to view your saved albums</p>
          <Link href="/login">
            <Button className="bg-olive-500 hover:bg-olive-600 text-white cursor-pointer active:scale-[0.97] transition-all duration-200">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Loading state
  if (isAuthLoading || favoritesLoading || loadingAlbums) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-olive-500 mx-auto mb-4" />
          <p className="text-stone-600">Loading your saved albums...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-black dark:via-black dark:to-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <motion.div
          className="mb-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-olive-100 to-pink-100 dark:from-olive-900/30 dark:to-pink-900/30 flex items-center justify-center"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Bookmark className="h-6 w-6 text-olive-600 dark:text-olive-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Saved Albums</h1>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  {savedAlbums.length} album{savedAlbums.length !== 1 ? 's' : ''} saved
                  {viewMode === 'collections' && ` · ${collections.length} collection${collections.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Link href="/explore">
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-olive-500">
                <Compass className="h-4 w-4" />
                Explore
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Empty State */}
        {savedAlbums.length === 0 ? (
          <NoSavedEmptyState onExplore={() => router.push('/explore')} />
        ) : (
          <>
            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* View Toggle */}
              <div className="flex items-center bg-white dark:bg-[#1A1A1A] rounded-lg border border-stone-200 dark:border-white/10 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.97]',
                    viewMode === 'grid'
                      ? 'bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/30'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">All</span>
                </button>
                <button
                  onClick={() => setViewMode('collections')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.97]',
                    viewMode === 'collections'
                      ? 'bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/30'
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Collections</span>
                </button>
              </div>

              {/* Sort / Group By */}
              {viewMode === 'grid' ? (
                <Select value={sortMode} onValueChange={(v: SortMode) => setSortMode(v)}>
                  <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-[#1A1A1A]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">
                      <span className="flex items-center gap-2"><Bookmark className="h-3.5 w-3.5" /> Recently Saved</span>
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
                  <SelectTrigger className="w-[170px] h-9 bg-white dark:bg-[#1A1A1A]">
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
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {collections.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.key)

                    return (
                      <motion.div
                        key={group.key}
                        className="bg-white dark:bg-[#111111] rounded-2xl border border-stone-200 dark:border-white/[0.06] overflow-hidden shadow-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        {/* Collection Header */}
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-500 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            {group.flag ? (
                              <span className="text-2xl">{group.flag}</span>
                            ) : groupBy === 'username' ? (
                              <div className="w-8 h-8 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                                <User className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-stone-500" />
                              </div>
                            )}
                            <div className="text-left">
                              <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                                {group.label}
                              </h3>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {group.albums.length} album{group.albums.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5 text-stone-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-stone-400" />
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
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCountryLabel(album: SavedAlbum): string {
  if (album.country_code) {
    return getCountryName(album.country_code) || album.country_code
  }
  if (album.location_name) {
    return extractCountryFromLocation(album.location_name)
  }
  return 'Unknown Location'
}

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
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
      className={cn(
        "group relative rounded-xl overflow-hidden",
        "bg-white dark:bg-[#1A1A1A] shadow-md hover:shadow-xl",
        "border border-stone-100 dark:border-white/[0.06]",
        "transition-all duration-300"
      )}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={prefersReducedMotion ? {} : { y: -4 }}
    >
      <Link href={`/albums/${album.id}`}>
        {/* Album Cover */}
        <div className={cn(
          "relative overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700",
          compact ? "aspect-square" : "aspect-[4/3]"
        )}>
          {album.cover_photo_url ? (
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes={compact ? "(max-width: 640px) 50vw, 25vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-10 w-10 text-stone-300 dark:text-stone-600" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Country flag badge */}
          {album.country_code && (
            <div className="absolute top-2 left-2 text-lg drop-shadow-md">
              {getFlagEmoji(album.country_code.toUpperCase())}
            </div>
          )}
        </div>

        {/* Album Info */}
        <div className={cn("p-3", compact ? "p-2.5" : "p-4")}>
          <h3 className={cn(
            "font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors",
            compact ? "text-sm mb-0.5" : "mb-1"
          )}>
            {album.title}
          </h3>

          {album.location_name && (
            <div className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 mb-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{album.location_name}</span>
            </div>
          )}

          {!compact && album.user && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {album.user.display_name || album.user.username}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Remove from Saved Button */}
      <div className="absolute top-2 right-2 z-10">
        <motion.button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(album.id)
          }}
          className={cn(
            "p-2 rounded-full cursor-pointer",
            "bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow-lg",
            "hover:bg-red-50 dark:hover:bg-red-950/50 hover:scale-110",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          title="Remove from saved"
          aria-label="Remove from saved"
        >
          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
        </motion.button>
      </div>
    </motion.div>
  )
}
