'use client'

import { useState, useMemo } from 'react'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { Bookmark, Compass, MapPin, Camera, Heart, User, Globe, ChevronDown, ChevronRight, LayoutGrid, FolderOpen } from 'lucide-react'
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
import { PageHeader } from '@/components/layout/PageHeader'

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

interface SavedContentProps {
  initialAlbums: SavedAlbum[]
}

export default function SavedContent({ initialAlbums }: SavedContentProps) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { removeFavorite } = useFavorites({
    targetType: 'album',
    autoFetch: false
  })
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>(initialAlbums)
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [groupBy, setGroupBy] = useState<GroupBy>('location')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

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

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          eyebrow="Library"
          title="Saved"
          subtitle={
            <>
              {savedAlbums.length} album{savedAlbums.length !== 1 ? 's' : ''} saved
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
                  onClick={() => setViewMode('grid')}
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
                  onClick={() => setViewMode('collections')}
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
                        className="rounded-2xl border border-border bg-card overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        {/* Collection Header */}
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            {group.flag ? (
                              <span className="text-2xl">{group.flag}</span>
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
      className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
    >
      <Link href={`/albums/${album.id}`}>
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
            "bg-background/90 backdrop-blur-sm shadow-md",
            "hover:bg-accent/10 hover:scale-110",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          title="Remove from saved"
          aria-label="Remove from saved"
        >
          <Heart className="h-4 w-4 text-accent fill-[currentColor]" />
        </motion.button>
      </div>
    </motion.div>
  )
}
