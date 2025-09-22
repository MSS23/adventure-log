'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Camera, Plus, Search, MapPin, Calendar, Globe, Eye, Lock, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'

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
      console.error('Error fetching albums:', err)
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
        return <Globe className="h-4 w-4 text-green-600" />
      case 'friends':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'private':
        return <Lock className="h-4 w-4 text-gray-600" />
      default:
        return <Eye className="h-4 w-4 text-gray-600" />
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Albums</h1>
            <p className="text-gray-600 mt-2">Organize your travel memories</p>
          </div>
          <Link href="/albums/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Album
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Albums</h1>
            <p className="text-gray-600 mt-2">Organize your travel memories</p>
          </div>
          <Link href="/albums/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Album
            </Button>
          </Link>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Failed to load albums</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                onClick={fetchAlbums}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Albums</h1>
          <p className="text-gray-600 mt-2">
            {albums.length === 0
              ? 'Start creating albums to organize your travel memories'
              : `${albums.length} album${albums.length === 1 ? '' : 's'} created`
            }
          </p>
        </div>
        <Link href="/albums/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Album
          </Button>
        </Link>
      </div>

      {/* Search */}
      {albums.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Albums Grid */}
      {filteredAlbums.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {albums.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first album to start organizing your travel photos and memories.
                  </p>
                  <Link href="/albums/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Album
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No albums found</h3>
                  <p className="text-gray-600">
                    No albums match your search criteria. Try a different search term.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => (
            <Link key={album.id} href={`/albums/${album.id}`}>
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
                {/* Album Cover */}
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-lg relative overflow-hidden">
                  {album.cover_photo_url ? (
                    <Image
                      src={album.cover_photo_url}
                      alt={album.title}
                      fill
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Visibility Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={album.visibility === 'public' ? 'default' : 'secondary'}
                      className="bg-white/90 text-gray-700 flex items-center gap-1"
                    >
                      {getVisibilityIcon(album.visibility)}
                      <span className="capitalize">{album.visibility}</span>
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {album.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {album.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Location */}
                    {album.location_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">{album.location_name}</span>
                      </div>
                    )}

                    {/* Date Range */}
                    {(album.start_date || album.end_date) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {album.start_date && formatDate(album.start_date)}
                          {album.start_date && album.end_date && ' - '}
                          {album.end_date && album.end_date !== album.start_date && formatDate(album.end_date)}
                        </span>
                      </div>
                    )}

                    {/* Photo Count */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Camera className="h-4 w-4 mr-2" />
                        <span>{album.photos?.length || 0} photos</span>
                      </div>
                      <span className="text-gray-500">
                        {formatDate(album.created_at)}
                      </span>
                    </div>

                    {/* Tags */}
                    {album.tags && album.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {album.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {album.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{album.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}