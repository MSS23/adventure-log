'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Plus, Search, MapPin, Globe, Eye, Lock, Users, Grid3x3, Trash2, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { MissingLocationBanner } from '@/components/notifications/MissingLocationNotification'
import { instagramStyles } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

export default function AlbumsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const filterUserId = searchParams.get('user')
  const [albums, setAlbums] = useState<Album[]>([])
  const [drafts, setDrafts] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const fetchAlbums = useCallback(async () => {
    const targetUserId = filterUserId || user?.id

    if (!targetUserId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all albums with photo count
      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          photos(id)
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
      const publishedAlbums = allAlbums.filter(album => (album.photos?.length || 0) > 0)
      const draftAlbums = allAlbums.filter(album => (album.photos?.length || 0) === 0)

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
    if (selectedAlbums.size === filteredAlbums.length) {
      setSelectedAlbums(new Set())
    } else {
      setSelectedAlbums(new Set(filteredAlbums.map(a => a.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedAlbums.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedAlbums.size} album${selectedAlbums.size === 1 ? '' : 's'}? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('albums')
        .delete()
        .in('id', Array.from(selectedAlbums))

      if (error) throw error

      // Refresh albums list
      await fetchAlbums()

      // Reset selection
      setSelectedAlbums(new Set())
      setSelectionMode(false)
    } catch (err) {
      log.error('Failed to delete albums', {
        component: 'AlbumsPage',
        action: 'deleteAlbums',
        albumIds: Array.from(selectedAlbums)
      }, err instanceof Error ? err : new Error(String(err)))
      alert('Failed to delete albums. Please try again.')
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={cn(instagramStyles.text.heading, "text-xl")}>My Albums</h1>
              <p className={instagramStyles.text.caption}>Organize your travel memories</p>
            </div>
          </div>
          <Link href="/albums/new">
            <Button size="sm" className={instagramStyles.button.primary}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </Link>
        </div>

        <div className={cn(instagramStyles.card, "border-red-200 bg-red-50 dark:bg-red-900/20 p-6")}>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load albums</p>
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>
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
    <div className="space-y-6">
      {/* Instagram-style Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={cn(instagramStyles.text.heading, "text-xl")}>
              {isViewingOtherUser ? "User's Albums" : "My Albums"}
            </h1>
            <p className={instagramStyles.text.caption}>
              {albums.length === 0
                ? 'Start creating albums'
                : `${albums.length} album${albums.length === 1 ? '' : 's'}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isViewingOtherUser && (albums.length > 0 || drafts.length > 0) && !selectionMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select
            </Button>
          )}
          {!isViewingOtherUser && (
            <Link href="/albums/new">
              <Button size="sm" className={instagramStyles.button.primary}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {albums.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 h-9",
              "bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50",
              "focus:bg-white dark:focus:bg-gray-800 transition-all duration-200"
            )}
          />
        </div>
      )}

      {/* Missing Location Banner */}
      {albums.length > 0 && <MissingLocationBanner />}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={cn(instagramStyles.text.heading, "text-lg")}>
                Drafts
              </h2>
              <p className={instagramStyles.text.caption}>
                {drafts.length} album{drafts.length === 1 ? '' : 's'} waiting for photos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={cn(
                  "relative group",
                  instagramStyles.card,
                  "p-4 hover:shadow-md transition-all",
                  selectionMode ? "cursor-pointer" : "",
                  selectedAlbums.has(draft.id) && "ring-2 ring-blue-500"
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
                      <CheckSquare className="h-6 w-6 text-blue-500" />
                    ) : (
                      <Square className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                )}
                {!selectionMode ? (
                  <Link href={`/albums/${draft.id}/edit`} className="block">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Camera className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(instagramStyles.text.heading, "text-sm truncate")}>
                          {draft.title}
                        </h3>
                        <p className={cn(instagramStyles.text.caption, "text-xs")}>
                          Draft
                        </p>
                      </div>
                    </div>
                    {draft.description && (
                      <p className={cn(instagramStyles.text.muted, "text-xs line-clamp-2 mb-3")}>
                        {draft.description}
                      </p>
                    )}
                    <Button size="sm" variant="outline" className="w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Photos
                    </Button>
                  </Link>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Camera className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(instagramStyles.text.heading, "text-sm truncate")}>
                          {draft.title}
                        </h3>
                        <p className={cn(instagramStyles.text.caption, "text-xs")}>
                          Draft
                        </p>
                      </div>
                    </div>
                    {draft.description && (
                      <p className={cn(instagramStyles.text.muted, "text-xs line-clamp-2 mb-3")}>
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
      {filteredAlbums.length === 0 && albums.length === 0 && drafts.length === 0 ? (
        <div className={cn(instagramStyles.card, "text-center py-16")}>
          <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className={cn(instagramStyles.text.heading, "text-lg mb-2")}>No albums yet</h3>
          <p className={cn(instagramStyles.text.muted, "mb-6")}>
            Create your first album to start organizing your travel photos and memories.
          </p>
          <Link href="/albums/new">
            <Button className={instagramStyles.button.primary}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Album
            </Button>
          </Link>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className={cn(instagramStyles.card, "text-center py-16")}>
          <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className={cn(instagramStyles.text.heading, "text-lg mb-2")}>No published albums</h3>
          <p className={instagramStyles.text.muted}>
            {drafts.length > 0
              ? `You have ${drafts.length} draft album${drafts.length > 1 ? 's' : ''} waiting for photos. Add photos to publish them!`
              : 'No albums match your search criteria. Try a different search term.'}
          </p>
        </div>
      ) : (
        <>
          {/* Grid Header / Selection Bar */}
          {selectionMode ? (
            <div className={cn(
              instagramStyles.card,
              "p-4 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-gray-900 border-b-2 border-blue-500"
            )}>
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                >
                  {selectedAlbums.size === filteredAlbums.length ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Select All
                    </>
                  )}
                </Button>
                <span className="text-sm font-medium">
                  {selectedAlbums.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={selectedAlbums.size === 0 || deleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleting ? 'Deleting...' : `Delete (${selectedAlbums.size})`}
                </Button>
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
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className={instagramStyles.text.caption}>
                  {filteredAlbums.length} album{filteredAlbums.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}

          {/* Instagram-style Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-3 lg:gap-4">
            {filteredAlbums.map((album) => {
              const isSelected = selectedAlbums.has(album.id)

              return selectionMode ? (
                <div
                  key={album.id}
                  onClick={() => handleToggleSelection(album.id)}
                  className={cn(
                    "relative group touch-manipulation cursor-pointer",
                    instagramStyles.interactive.hover,
                    instagramStyles.interactive.active
                  )}
                >
                  {/* Square Album Cover */}
                  <div className={cn(
                    "relative aspect-square overflow-hidden rounded-lg transition-all duration-200",
                    isSelected && "ring-4 ring-blue-500 scale-95"
                  )}>
                    {album.cover_photo_url ? (
                      <Image
                        src={album.cover_photo_url}
                        alt={album.title}
                        fill
                        className={cn(
                          instagramStyles.photoGrid,
                          "group-hover:scale-105 transition-transform duration-300"
                        )}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {/* Selection checkbox */}
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        isSelected ? "bg-blue-500" : "bg-white/80"
                      )}>
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-white" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className={cn(
                    "relative group touch-manipulation",
                    instagramStyles.interactive.hover,
                    instagramStyles.interactive.active
                  )}>
                    {/* Square Album Cover */}
                    <div className="relative aspect-square overflow-hidden rounded-lg transition-transform duration-200 active:scale-95">
                      {album.cover_photo_url ? (
                        <Image
                          src={album.cover_photo_url}
                          alt={album.title}
                          fill
                          className={cn(
                            instagramStyles.photoGrid,
                            "group-hover:scale-105 transition-transform duration-300"
                          )}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Overlay with album info */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex flex-col justify-between p-2">
                        {/* Top: Visibility badge */}
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-black/60 rounded-full p-1.5">
                            {getVisibilityIcon(album.visibility || album.privacy)}
                          </div>
                        </div>

                        {/* Bottom: Album info */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <h3 className="text-white font-semibold text-sm truncate mb-1">
                            {album.title}
                          </h3>
                          <div className="flex items-center gap-2 text-white/80 text-xs">
                            <div className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              <span>{album.photos?.length || 0}</span>
                            </div>
                            {(album.location_name || album.country_code) && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{album.location_name || album.country_code}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Photo count indicator (always visible) */}
                      <div className="absolute top-2 left-2">
                        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          <span>{album.photos?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}