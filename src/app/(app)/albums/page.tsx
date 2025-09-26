'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Camera, Plus, Search, MapPin, Globe, Eye, Lock, Users, Grid3x3 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { MissingLocationBanner } from '@/components/notifications/MissingLocationNotification'
import { instagramStyles, instagramClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function AlbumsPage() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const fetchAlbums = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          photos(id)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAlbums(data || [])
    } catch (err) {
      log.error('Failed to fetch albums', {
        component: 'AlbumsPage',
        action: 'fetchAlbums',
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to fetch albums')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user) {
      fetchAlbums()
    }
  }, [user, fetchAlbums])

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
              My Albums
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
          <Link href="/albums/new">
            <Button size="sm" className={instagramStyles.button.primary}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </Link>
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

      {/* Albums Grid - Instagram Style */}
      {filteredAlbums.length === 0 ? (
        <div className={cn(instagramStyles.card, "text-center py-16")}>
          <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {albums.length === 0 ? (
            <>
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
            </>
          ) : (
            <>
              <h3 className={cn(instagramStyles.text.heading, "text-lg mb-2")}>No albums found</h3>
              <p className={instagramStyles.text.muted}>
                No albums match your search criteria. Try a different search term.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Grid Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className={instagramStyles.text.caption}>
                {filteredAlbums.length} album{filteredAlbums.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Instagram-style Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-3 lg:gap-4">
            {filteredAlbums.map((album) => (
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
                          {getVisibilityIcon(album.visibility)}
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
                          {album.location_name && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{album.location_name}</span>
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}