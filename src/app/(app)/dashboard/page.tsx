'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MapPin,
  Globe,
  Camera,
  Edit,
  Settings,
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { useUserLevels } from '@/lib/hooks/useUserLevels'
import { MissingLocationNotification } from '@/components/notifications/MissingLocationNotification'
import { ProfileCompletionPrompt } from '@/components/onboarding/ProfileCompletionPrompt'
import { FirstAlbumPrompt } from '@/components/onboarding/FirstAlbumPrompt'
import dynamic from 'next/dynamic'

// Lazy load MonthlyHighlights - it's below the fold and not critical for LCP
const MonthlyHighlights = dynamic(
  () => import('@/components/dashboard/MonthlyHighlights').then(mod => ({ default: mod.MonthlyHighlights })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-64" />,
    ssr: false
  }
)

interface RecentAlbum {
  id: string
  title: string
  cover_photo_url?: string
  created_at: string
  status?: string
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { currentLevel, currentTitle, getLevelBadgeColor } = useUserLevels()
  const [stats, setStats] = useState({
    albums: 0,
    photos: 0,
    countries: 0,
    cities: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([])
  const [avatarKey, setAvatarKey] = useState(Date.now()) // Force avatar re-render
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    try {
      setLoading(true)
      setError(null) // Clear previous errors

      const [albumsResult, photosResult, recentAlbumsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_code, location_name, latitude, longitude, status')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id),
        supabase
          .from('albums')
          .select('id, title, cover_photo_url, created_at, status')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(6)
      ])

      // Check ALL errors and throw to be caught by catch block
      if (albumsResult.error) {
        throw new Error('Failed to fetch albums')
      }
      if (photosResult.error) {
        throw new Error('Failed to fetch photos')
      }
      if (recentAlbumsResult.error) {
        throw new Error('Failed to fetch recent albums')
      }

      const albums = (albumsResult.data || []).filter(a => a.status !== 'draft')

      // IMPORTANT: Only count albums with coordinates (to match globe display)
      // Albums without lat/long won't appear on the globe, so they shouldn't be counted here
      const albumsWithLocation = albums.filter(a => a.latitude && a.longitude)

      // Count unique countries using country_code OR extract from location_name
      const uniqueCountries = new Set(
        albumsWithLocation
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
        albumsWithLocation
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
        component: 'DashboardPage',
        count: recentAlbumsFiltered.length,
        total: recentAlbumsResult.data?.length || 0
      })

      setRecentAlbums(recentAlbumsFiltered)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data'
      setError(errorMessage)
      log.error('Error fetching profile stats', { component: 'DashboardPage', userId: user?.id }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, fetchStats])

  // Update avatar key when profile changes to force re-render
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarKey(Date.now())
    }
  }, [profile?.avatar_url])

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Simplified Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage
                key={avatarKey}
                src={profile.avatar_url ? `${profile.avatar_url}?t=${avatarKey}` : ''}
                alt={profile.display_name || profile.username}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.display_name || profile.username || '')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.display_name || profile.username}
                </h1>
                {profile.display_name && profile.username && (
                  <p className="text-gray-500 text-sm mt-1">@{profile.username}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-gray-700 text-sm">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <Badge className={`text-xs ${getLevelBadgeColor(currentLevel)}`}>
                  Level {currentLevel} · {currentTitle}
                </Badge>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <Link href="/profile/edit" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Link href="/settings" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/albums">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Camera className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.albums}</div>
              <div className="text-sm text-gray-600">Albums</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/albums">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <ImageIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.photos}</div>
              <div className="text-sm text-gray-600">Photos</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/globe">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Globe className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.countries}</div>
              <div className="text-sm text-gray-600">Countries</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.cities}</div>
              <div className="text-sm text-gray-600">Cities</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="text-red-600 flex-1">
                <p className="font-medium">Failed to load profile data</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchStats()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Prompts */}
      <ProfileCompletionPrompt profile={profile} />
      <FirstAlbumPrompt hasAlbums={stats.albums > 0} />
      <MissingLocationNotification />

      {/* Monthly Highlights */}
      {!loading && <MonthlyHighlights />}

      {/* Recent Albums */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Albums</CardTitle>
            <Link href="/albums">
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentAlbums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {recentAlbums.map((album) => {
                const coverPhotoUrl = album.cover_photo_url ? getPhotoUrl(album.cover_photo_url) : null

                return (
                  <Link key={album.id} href={`/albums/${album.id}`}>
                    <div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                      {coverPhotoUrl ? (
                        <Image
                          src={coverPhotoUrl}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
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
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No albums yet</p>
              <Link href="/albums/new">
                <Button>
                  <Camera className="h-4 w-4 mr-2" />
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
