'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Plus, Search, MapPin, Globe, Eye, Lock, Users, Grid3x3, Trash2, CheckSquare, Square, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { MissingLocationBanner } from '@/components/notifications/MissingLocationNotification'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { NoAlbumsEmptyState } from '@/components/ui/enhanced-empty-state'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const photoCount = (album: Album) => (album.photos as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0

function AlbumsPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const filterUserId = searchParams.get('user')
  const [albums, setAlbums] = useState<Album[]>([])
  const [drafts, setDrafts] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'photo-count'>('date-desc')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()
  const prefersReducedMotion = useReducedMotion()

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

  const fetchAlbums = useCallback(async () => {
    const targetUserId = filterUserId || user?.id

    if (!targetUserId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

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

      setAlbums(publishedAlbums)
      setDrafts(draftAlbums)
    } catch (err) {
      log.error('Failed to fetch albums', {
        component: 'AlbumsPage',
        action: 'fetchAlbums',
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Unable to load albums. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, filterUserId, supabase])

  useEffect(() => {
    if (user) {
      fetchAlbums()
    }
  }, [user, fetchAlbums])

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
      await fetchAlbums()
      // Refresh server cache so deleted album disappears from globe, feed, explore, etc.
      router.refresh()
    } catch (err) {
      log.error('Failed to delete album', {
        component: 'AlbumsPage',
        action: 'quickDelete',
        albumId: album.id
      }, err instanceof Error ? err : new Error(String(err)))
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

      toast.success(`${selectedAlbums.size} album${selectedAlbums.size === 1 ? '' : 's'} deleted`)
      await fetchAlbums()
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
      }, err instanceof Error ? err : new Error(String(err)))
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
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
            <h1 className="al-display text-3xl md:text-4xl">Albums</h1>
            <p className="text-sm text-muted-foreground">Organize your travel memories</p>
          </header>
          <Link href="/albums/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6">
          <div className="text-center">
            <p className="font-medium text-destructive">Failed to load albums</p>
            <p className="mt-1 text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={fetchAlbums}
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
            {isViewingOtherUser ? "User's Albums" : 'Albums'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {albums.length === 0
              ? 'Start creating albums'
              : `${albums.length} album${albums.length === 1 ? '' : 's'}`
            }
          </p>
        </header>

        <div className="flex items-center gap-2">
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
          {!isViewingOtherUser && (
            <Link href="/albums/new">
              <Button size="sm" className="cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar and Sort */}
      {albums.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 cursor-pointer transition-all duration-200">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
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
                {drafts.length} album{drafts.length === 1 ? '' : 's'} waiting for photos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={cn(
                  "relative group rounded-2xl border border-border bg-card p-4",
                  "transition-all duration-200 hover:border-primary/30 hover:shadow-md",
                  selectionMode ? "cursor-pointer" : "cursor-pointer",
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
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setQuickDeleteAlbum(draft)
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        title="Delete draft"
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
            <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 rounded-2xl border border-border bg-card">
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
                      <AlertDialogTitle>Delete {selectedAlbums.size} album{selectedAlbums.size === 1 ? '' : 's'}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedAlbums.size === 1 ? 'this album' : 'these albums'} and all associated photos. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
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
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Grid3x3 className="h-4 w-4" />
                <span className="text-xs font-mono tracking-wide">
                  {sortedAlbums.length} album{sortedAlbums.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}

          {/* Instagram-style Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={searchQuery + sortBy}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4"
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
                      "relative aspect-square overflow-hidden rounded-2xl bg-muted transition-all duration-200",
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
                              isSelected ? "bg-primary" : "bg-white/80 backdrop-blur-sm"
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
                              <Square className="h-4 w-4 text-black/60" />
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
                    className="group"
                  >
                    <Link href={`/albums/${album.id}`} className="cursor-pointer">
                      <div className={cn(
                        "relative touch-manipulation",
                        "rounded-2xl overflow-hidden"
                      )}>
                        {/* Square Album Cover */}
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted transition-shadow duration-200 group-hover:shadow-md">
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

                          {/* Mobile: Bottom gradient with title always visible */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-2 pt-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 md:from-black/75">
                            <h3 className="text-white font-heading font-semibold text-xs sm:text-sm truncate drop-shadow-sm">
                              {album.title}
                            </h3>
                            {album.location_name && (
                              <div className="flex items-center gap-1 text-white/90 text-[10px] sm:text-xs mt-0.5 drop-shadow-sm">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">{album.location_name}</span>
                              </div>
                            )}
                          </div>

                          {/* Hover overlay (desktop) */}
                          <div className="hidden md:flex absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex-col justify-between p-2">
                            <div className="flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="bg-black/60 rounded-full p-1.5">
                                {getVisibilityIcon(album.visibility || album.privacy)}
                              </div>
                              {!isViewingOtherUser && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setQuickDeleteAlbum(album)
                                  }}
                                  className="bg-destructive/80 hover:bg-destructive backdrop-blur-sm text-white rounded-full p-1.5 transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                                  title="Delete album"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick delete button (mobile) - subtle, bottom-right */}
                          {!isViewingOtherUser && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setQuickDeleteAlbum(album)
                              }}
                              className="md:hidden absolute bottom-1.5 right-1.5 bg-black/50 active:bg-destructive backdrop-blur-sm text-white/90 active:text-white rounded-full p-1 transition-all duration-200 cursor-pointer z-10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}

                          {/* Photo count indicator (always visible) */}
                          <div className="absolute top-2 left-2">
                            <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 drop-shadow-sm">
                              <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white drop-shadow" />
                              <span>{photoCount(album)}</span>
                            </div>
                          </div>
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
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    }>
      <AlbumsPageContent />
    </Suspense>
  )
}