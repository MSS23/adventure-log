'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  MapPin,
  Globe,
  Calendar,
  Camera,
  Edit,
  Settings,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface RecentAlbum {
  id: string
  title: string
  cover_photo_url?: string
  cover_image_url?: string
  created_at: string
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    albums: 0,
    photos: 0,
    countries: 0,
    cities: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([])
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    try {
      const [albumsResult, photosResult, recentAlbumsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_code, location_name, status')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id),
        supabase
          .from('albums')
          .select('id, title, cover_photo_url, cover_image_url, created_at, status')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(6)
      ])

      // Log errors if any
      if (albumsResult.error) {
        log.error('Error fetching albums for stats', { error: albumsResult.error })
      }
      if (recentAlbumsResult.error) {
        log.error('Error fetching recent albums', { error: recentAlbumsResult.error })
      }

      const albums = (albumsResult.data || []).filter(a => a.status !== 'draft')

      // Count unique countries using country_code OR extract from location_name
      const uniqueCountries = new Set(
        albums
          .filter(a => a.country_code || a.location_name)
          .map(a => {
            if (a.country_code) return a.country_code
            // Extract country from location_name (last part after comma)
            if (a.location_name) {
              const parts = a.location_name.split(',').map((p: string) => p.trim())
              return parts[parts.length - 1] || ''
            }
            return ''
          })
          .filter(country => country.length > 0)
      )

      // Count unique cities using location_name (first part before comma)
      const uniqueCities = new Set(
        albums
          .filter(a => a.location_name)
          .map(a => {
            const parts = a.location_name.split(',').map((p: string) => p.trim())
            return parts[0] || a.location_name
          })
      )

      setStats({
        albums: albums.length,
        photos: photosResult.data?.length || 0,
        countries: uniqueCountries.size,
        cities: uniqueCities.size
      })

      // Filter out draft albums from recent albums
      const recentAlbumsFiltered = (recentAlbumsResult.data || []).filter(a => a.status !== 'draft')

      log.info('Recent albums fetched', {
        component: 'ProfilePage',
        count: recentAlbumsFiltered.length,
        total: recentAlbumsResult.data?.length || 0
      })

      setRecentAlbums(recentAlbumsFiltered)
    } catch (err) {
      log.error('Error fetching profile stats', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, fetchStats])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-yellow-600 font-medium">Profile not found</p>
              <p className="text-yellow-500 text-sm mt-1">Please complete your profile setup</p>
              <Link href="/setup" className="mt-4 inline-block">
                <Button>Complete Profile Setup</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || profile.username} />
            <AvatarFallback className="text-xl">
              {getInitials(profile.display_name || profile.username || '')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.display_name || profile.username}
            </h1>
            {profile.display_name && (
              <p className="text-gray-800 text-lg">@{profile.username}</p>
            )}

            {profile.bio && (
              <p className="text-gray-700 mt-3 max-w-2xl">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-800">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}

              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-around bg-white rounded-lg border p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.albums}
          </div>
          <div className="text-sm text-gray-600 mt-1">Albums</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.photos}
          </div>
          <div className="text-sm text-gray-600 mt-1">Photos</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.countries}
          </div>
          <div className="text-sm text-gray-600 mt-1">Countries</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.cities}
          </div>
          <div className="text-sm text-gray-600 mt-1">Cities</div>
        </div>
      </div>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Privacy & Visibility
          </CardTitle>
          <CardDescription>
            How others can see and interact with your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Profile Visibility</p>
                <p className="text-sm text-gray-800">Who can see your profile and adventures</p>
              </div>
              <Badge variant={profile.privacy_level === 'public' ? 'default' : 'secondary'}>
                {profile.privacy_level === 'public' ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : profile.privacy_level === 'friends' ? (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Friends Only
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with your adventure logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/albums/new">
              <Button className="w-full h-16 text-left justify-start">
                <Camera className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Create New Album</div>
                  <div className="text-sm opacity-90">Start documenting your next adventure</div>
                </div>
              </Button>
            </Link>

            <Link href="/globe">
              <Button variant="outline" className="w-full h-16 text-left justify-start">
                <Globe className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Explore Your Globe</div>
                  <div className="text-sm opacity-70">See your travels on an interactive 3D globe</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Albums */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Albums</CardTitle>
            <Link href="/albums">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentAlbums.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentAlbums.map((album) => {
                const coverPhotoPath = album.cover_photo_url || album.cover_image_url
                const coverPhotoUrl = coverPhotoPath ? getPhotoUrl(coverPhotoPath) : null

                return (
                  <Link key={album.id} href={`/albums/${album.id}`}>
                    <div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      {coverPhotoUrl ? (
                        <Image
                          src={coverPhotoUrl}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-white font-medium text-sm truncate">{album.title}</h3>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No albums yet</p>
              <Link href="/albums/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Create Your First Album
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}