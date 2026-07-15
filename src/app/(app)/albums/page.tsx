'use client'

import { Suspense, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Plus, Search, MapPin, Globe, Eye, Lock, Users, Trash2, CheckSquare, Square, ArrowUpDown, Images, Star, Move } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { log, toError } from '@/lib/utils/logger'
import { MissingLocationBanner } from '@/components/notifications/MissingLocationNotification'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getCityName } from '@/lib/utils/country'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { NoAlbumsEmptyState } from '@/components/ui/enhanced-empty-state'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { apiFetch } from '@/lib/api/client'

const photoCount = (album: Album) => (album.photos as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0

type SupabaseClient = ReturnType<typeof createClient>

// Fetch all of a user's albums (with photo counts) and split them into
// published albums (1+ photos) vs drafts (0 photos). Kept at module scope so
// it can be the React Query `queryFn` body — the result for each user is
// cached (5min staleTime + refetchOnMount:false from QueryProvider), so
// revisiting the Albums page via the sidebar repaints from cache instantly
// instead of re-running this query behind a skeleton.
async function fetchAlbums(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<{ albums: Album[]; drafts: Album[] }> {
  // Fetch all albums with photo counts
  const { data, error } = await supabase
    .from('albums')
    .select(`
      *,
      photos(count)
    `)
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('Error fetching albums', { userId: targetUserId }, error)
    throw error
  }

  // Transform cover photo URLs to full Supabase storage URLs
  const allAlbums = (data || []).map(album => ({
    ...album,
    cover_photo_url: getPhotoUrl(album.cover_photo_url)
  }))

  // Separate drafts (0 photos) from published albums (1+ photos)
  const publishedAlbums = allAlbums.filter(album => photoCount(album) > 0)
  const draftAlbums = allAlbums.filter(album => photoCount(album) === 0)

  return { albums: publishedAlbums, drafts: draftAlbums }
}

function AlbumsPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const filterUserId = searchParams.get('user')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'photo-count' | 'country'>('date-desc')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [coverPositionAlbum, setCoverPositionAlbum] = useState<Album | null>(null)
  const [savingCoverPosition, setSavingCoverPosition] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const targetUserId = filterUserId || user?.id

  // React Query owns the albums cache, so navigating away and back via the
  // sidebar repaints from cache instantly instead of re-fetching behind a
  // skeleton. Keyed by the target user id so a self view and an "other user"
  // view cache apart. enabled until we know which user to load.
  const {
    data,
    isPending,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['albums', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      try {
        return await fetchAlbums(supabase, targetUserId!)
      } catch (err) {
        log.error('Failed to fetch albums', {
          component: 'AlbumsPage',
          action: 'fetchAlbums',
          userId: user?.id
        }, toError(err))
        throw err
      }
    },
  })

  const albums = useMemo(() => data?.albums ?? [], [data])
  const drafts = useMemo(() => data?.drafts ?? [], [data])
  // When there's no user to load for yet, the query is disabled (isPending stays
  // true forever), so treat "no target user" as not-loading to match the old
  // behavior where fetchAlbums short-circuited and cleared loading.
  const loading = !!targetUserId && isPending
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Unable to load albums. Please try again.')
    : null

  // Invalidate the cached albums query so a refetch runs after a mutation
  // (delete). Replaces the old manual `fetchAlbums()` re-invocation.
  const reloadAlbums = () =>
    queryClient.invalidateQueries({ queryKey: ['albums', targetUserId] })

  // Animation variants for grid
  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        delayChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
  }

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.country_code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Use the travel date for chronological sorting (falls back to upload time),
  // so a trip from years ago doesn't jump to the top just because it was uploaded today.
  const travelTime = (album: Album) =>
    new Date(album.date_start ?? album.created_at).getTime()

  // Sort albums based on selected sort option
  const sortedAlbums = [...filteredAlbums].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return travelTime(b) - travelTime(a)
      case 'date-asc':
        return travelTime(a) - travelTime(b)
      case 'name-asc':
        return a.title.localeCompare(b.title)
      case 'name-desc':
        return b.title.localeCompare(a.title)
      case 'photo-count':
        return photoCount(b) - photoCount(a)
      case 'country': {
        const countryA = a.country_code || a.location_name?.split(',').at(-1)?.trim() || 'ZZZ'
        const countryB = b.country_code || b.location_name?.split(',').at(-1)?.trim() || 'ZZZ'
        return countryA.localeCompare(countryB) || travelTime(b) - travelTime(a)
      }
      default:
        return 0
    }
  })

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3 text-white" />
      case 'followers':
        return <Users className="h-3 w-3 text-white" />
      case 'friends':
        return <Users className="h-3 w-3 text-white" />
      case 'private':
        return <Lock className="h-3 w-3 text-white" />
      default:
        return <Eye className="h-3 w-3 text-white" />
    }
  }

  const handleToggleSelection = (albumId: string) => {
    setSelectedAlbums(prev => {
      const newSet = new Set(prev)
      if (newSet.has(albumId)) {
        newSet.delete(albumId)
      } else {
        newSet.add(albumId)
      }
      return newSet
    })
  }

  const handleCoverPositionSave = async (position: {
    position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset: number
    yOffset: number
  }) => {
    if (!coverPositionAlbum) return
    setSavingCoverPosition(true)
    try {
      const response = await apiFetch(`/api/albums/${coverPositionAlbum.id}/cover-position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position),
      })
      if (!response.ok) throw new Error('Failed to update cover position')

      queryClient.setQueryData<{ albums: Album[]; drafts: Album[] }>(
        ['albums', targetUserId],
        (current) => current
          ? {
              ...current,
              albums: current.albums.map((album) => album.id === coverPositionAlbum.id
                ? {
                    ...album,
                    cover_photo_position: position.position,
                    cover_photo_x_offset: position.xOffset,
                    cover_photo_y_offset: position.yOffset,
                  }
                : album),
            }
          : current
      )
      toast.success('Cover crop updated')
      setCoverPositionAlbum(null)
    } catch (err) {
      log.error('Failed to update album cover position', {
        component: 'AlbumsPage',
        action: 'updateCoverPosition',
        albumId: coverPositionAlbum.id,
      }, toError(err))
      toast.error('Could not update the cover crop')
    } finally {
      setSavingCoverPosition(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedAlbums.size === sortedAlbums.length) {
      setSelectedAlbums(new Set())
    } else {
      setSelectedAlbums(new Set(sortedAlbums.map(a => a.id)))
    }
  }

  // Quick delete a single album (from trash icon on card)
  const [quickDeleteAlbum, setQuickDeleteAlbum] = useState<Album | null>(null)
  const [quickDeleting, setQuickDeleting] = useState(false)

  const handleQuickDelete = async (album: Album) => {
    setQuickDeleting(true)
    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id)

      if (error) throw error

      toast.success(`"${album.title}" deleted`)
      await reloadAlbums()
      // Refresh server cache so deleted album disappears from globe, feed, explore, etc.
      router.refresh()
    } catch (err) {
      log.error('Failed to delete album', {
        component: 'AlbumsPage',
        action: 'quickDelete',
        albumId: album.id
      }, toError(err))
      toast.error('Failed to delete album')
    } finally {
      setQuickDeleting(false)
      setQuickDeleteAlbum(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedAlbums.size === 0) return

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('albums')
        .delete()
        .in('id', Array.from(selectedAlbums))

      if (error) throw error

      toast.success(`${selectedAlbums.size} memor${selectedAlbums.size === 1 ? 'y' : 'ies'} deleted`)
      await reloadAlbums()
      // Refresh server cache so deleted albums disappear from globe, feed, explore, etc.
      router.refresh()

      // Reset selection
      setSelectedAlbums(new Set())
      setSelectionMode(false)
    } catch (err) {
      log.error('Failed to delete albums', {
        component: 'AlbumsPage',
        action: 'deleteAlbums',
        albumIds: Array.from(selectedAlbums)
      }, toError(err))
      toast.error('Failed to delete albums. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelSelection = () => {
    setSelectionMode(false)
    setSelectedAlbums(new Set())
  }


  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <header className="space-y-1">
            <p className="al-eyebrow">Library</p>
            <h1 className="al-display text-3xl md:text-4xl">Memories</h1>
            <p className="text-sm text-muted-foreground">Organize your travel memories</p>
          </header>
          <Link href="/albums/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add memory
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6">
          <div className="text-center">
            <p className="font-medium text-destructive">Failed to load memories</p>
            <p className="mt-1 text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isViewingOtherUser = !!filterUserId && filterUserId !== user?.id

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="space-y-1">
          <p className="al-eyebrow">Library</p>
          <h1 className="al-display text-3xl md:text-4xl">
            {isViewingOtherUser ? "Traveler's memories" : 'Your memories'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {albums.length === 0
              ? 'Keep your first travel memory'
              : `${albums.length} memor${albums.length === 1 ? 'y' : 'ies'}`
            }
          </p>
        </header>

        <div className="flex items-center gap-2">
          {!isViewingOtherUser && !selectionMode && (
            <Link href="/organize">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
              >
                <Images className="h-4 w-4 mr-1" />
                Manage photos
              </Button>
            </Link>
          )}
          {!isViewingOtherUser && (albums.length > 0 || drafts.length > 0) && !selectionMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectionMode(true)}
              className="cursor-pointer"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select
            </Button>
          )}
          {/* On phones the global "+" FAB already covers creation — a second
              New button here just crowds the header row. */}
          {!isViewingOtherUser && (
            <Link href="/albums/new" className="hidden sm:block">
              <Button size="sm" className="cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                Add memory
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar and Sort — one row on phones so the toolbar doesn't stack
          into two full-width controls above the grid. */}
      {albums.length > 0 && (
        <div className="flex flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-10 cursor-pointer transition-all duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowUpDown className="hidden sm:block h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="photo-count">Most Photos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Missing Location Banner */}
      {albums.length > 0 && <MissingLocationBanner />}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="al-eyebrow mb-0.5">Work in progress</p>
              <h2 className="al-display text-xl md:text-2xl">
                Drafts
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {drafts.length} memor{drafts.length === 1 ? 'y' : 'ies'} waiting for photos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={cn(
                  "relative group rounded-2xl border border-border bg-card p-5 cursor-pointer",
                  "shadow-[var(--shadow-resting)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-hover)]",
                  selectedAlbums.has(draft.id) && "ring-2 ring-ring"
                )}
                onClick={(e) => {
                  if (selectionMode) {
                    e.preventDefault()
                    handleToggleSelection(draft.id)
                  }
                }}
              >
                {selectionMode && (
                  <div className="absolute top-2 right-2 z-10">
                    {selectedAlbums.has(draft.id) ? (
                      <CheckSquare className="h-6 w-6 text-primary" />
                    ) : (
                      <Square className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                {!selectionMode ? (
                  <div>
                    <Link href={`/albums/${draft.id}/edit`} className="block cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-sm font-semibold text-foreground truncate">
                            {draft.title}
                          </h3>
                          <span className="al-badge mt-1">Draft</span>
                        </div>
                      </div>
                      {draft.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {draft.description}
                        </p>
                      )}
                    </Link>
                    <div className="flex gap-2">
                      <Link href={`/albums/${draft.id}/edit`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Photos
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setQuickDeleteAlbum(draft)
                        }}
                        className="flex items-center justify-center min-h-11 min-w-11 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        title="Delete draft"
                        aria-label={`Delete draft ${draft.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-sm font-semibold text-foreground truncate">
                          {draft.title}
                        </h3>
                        <span className="al-badge mt-1">Draft</span>
                      </div>
                    </div>
                    {draft.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {draft.description}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Albums Grid - Instagram Style */}
      {sortedAlbums.length === 0 && albums.length === 0 && drafts.length === 0 ? (
        <NoAlbumsEmptyState onCreateAlbum={() => router.push('/albums/new')} />
      ) : sortedAlbums.length === 0 ? (
        <NoAlbumsEmptyState onCreateAlbum={() => router.push('/albums/new')} />
      ) : (
        <>
          {/* Grid Header / Selection Bar */}
          {selectionMode ? (
            <div className="p-4 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 rounded-2xl border border-border bg-card shadow-[var(--shadow-overlay)]">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                >
                  {selectedAlbums.size === sortedAlbums.length ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Deselect All</span>
                      <span className="sm:hidden">All</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Select All</span>
                      <span className="sm:hidden">All</span>
                    </>
                  )}
                </Button>
                <span className="text-sm font-medium">
                  {selectedAlbums.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedAlbums.size === 0 || deleting}
                    >
                      <Trash2 className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{deleting ? 'Deleting...' : `Delete (${selectedAlbums.size})`}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedAlbums.size} memor{selectedAlbums.size === 1 ? 'y' : 'ies'}?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete {selectedAlbums.size === 1 ? 'this memory' : 'these memories'} and all associated photos. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelSelection}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null /* count already lives in the page header — a second
                      "N albums" row above the grid was pure noise */}

          {/* Instagram-style Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={searchQuery + sortBy}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4"
              initial="hidden"
              animate="visible"
              variants={gridVariants}
            >
              {sortedAlbums.map((album) => {
                const isSelected = selectedAlbums.has(album.id)

                return selectionMode ? (
                  <motion.div
                    key={album.id}
                    variants={cardVariants}
                    onClick={() => handleToggleSelection(album.id)}
                    className="relative group touch-manipulation cursor-pointer transition-all duration-200 active:scale-[0.97]"
                  >
                    {/* Square Album Cover */}
                    <div className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-resting)] transition-all duration-200",
                      isSelected && "ring-2 ring-ring scale-95"
                    )}>
                      {album.cover_photo_url ? (
                        <Image
                          src={album.cover_photo_url}
                          alt={album.title}
                          fill
                          quality={90}
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          style={{ objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%` }}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Animated Selection checkbox */}
                      <AnimatePresence>
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <motion.div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                              isSelected ? "bg-primary" : "bg-card/80 backdrop-blur-sm"
                            )}
                            animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {isSelected ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                <CheckSquare className="h-4 w-4 text-primary-foreground" />
                              </motion.div>
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={album.id}
                    variants={cardVariants}
                    whileHover={prefersReducedMotion ? {} : { y: -2 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="group relative"
                  >
                    {!isViewingOtherUser && album.cover_photo_url && (
                      <button
                        type="button"
                        onClick={() => setCoverPositionAlbum(album)}
                        className="absolute right-2 top-2 z-20 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label={`Adjust the cover crop for ${album.title}`}
                        title="Adjust cover crop"
                      >
                        <Move className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                    <Link href={`/albums/${album.id}`} className="cursor-pointer">
                      <div className={cn(
                        "relative touch-manipulation",
                        "rounded-2xl overflow-hidden"
                      )}>
                        {/* Album Cover */}
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-resting)] transition-shadow duration-200 group-hover:shadow-[var(--shadow-hover)]">
                          {album.cover_photo_url ? (
                            <Image
                              src={album.cover_photo_url}
                              alt={album.title}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              style={{ objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%` }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Camera className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {/* Mobile: bottom scrim with title — kept legible and
                              tight (single lines, strong scrim + text shadow,
                              city-only location). On desktop it fades in on hover. */}
                          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-9 bg-gradient-to-t from-black/85 via-black/50 to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <h3 className="text-white font-heading font-semibold text-[13px] leading-tight line-clamp-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
                              {album.title}
                            </h3>
                            {getCityName(album.location_name) && (
                              <div className="flex items-center gap-1 text-white/85 text-[11px] leading-tight mt-0.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">{getCityName(album.location_name)}</span>
                              </div>
                            )}
                          </div>

                          {/* Hover overlay (desktop) */}
                          <div className="hidden md:flex absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex-col justify-between p-2">
                            <div className="flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="bg-black/55 backdrop-blur-sm rounded-full p-1.5">
                                {getVisibilityIcon(album.visibility || album.privacy)}
                              </div>
                            </div>
                          </div>

                          {/* Photo count indicator (always visible) */}
                          <div className="absolute top-2 left-2">
                            <div className="bg-black/55 backdrop-blur-sm text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 drop-shadow-sm">
                              <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white drop-shadow" />
                              <span>{photoCount(album)}</span>
                            </div>
                          </div>

                          {/* Favourite badge (owner's favourited albums only;
                              `is_favorite` is undefined pre-migration => hidden) */}
                          {!isViewingOtherUser && album.is_favorite && (
                            <div className={cn("absolute right-2", album.cover_photo_url ? "top-14" : "top-2")}>
                              <div className="bg-black/55 backdrop-blur-sm rounded-full p-1 sm:p-1.5 drop-shadow-sm" title="Highlighted">
                                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 fill-current" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {coverPositionAlbum?.cover_photo_url && (
        <CoverPhotoPositionEditor
          isOpen={!!coverPositionAlbum}
          onClose={() => {
            if (!savingCoverPosition) setCoverPositionAlbum(null)
          }}
          imageUrl={coverPositionAlbum.cover_photo_url}
          currentPosition={{
            position: coverPositionAlbum.cover_photo_position || 'center',
            xOffset: coverPositionAlbum.cover_photo_x_offset ?? 50,
            yOffset: coverPositionAlbum.cover_photo_y_offset ?? 50,
          }}
          onSave={handleCoverPositionSave}
          isSaving={savingCoverPosition}
        />
      )}

      {/* Quick Delete Confirmation Dialog */}
      <AlertDialog open={!!quickDeleteAlbum} onOpenChange={(open) => {
        if (!open && !quickDeleting) setQuickDeleteAlbum(null)
      }}>
        <AlertDialogContent className="rounded-2xl mx-4 max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{quickDeleteAlbum?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this album and all its photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={quickDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quickDeleteAlbum && handleQuickDelete(quickDeleteAlbum)}
              disabled={quickDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              {quickDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function AlbumsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      </div>
    }>
      <AlbumsPageContent />
    </Suspense>
  )
}
