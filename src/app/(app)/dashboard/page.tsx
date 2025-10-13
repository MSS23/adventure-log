'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
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
  Link as LinkIcon,
  Image as ImageIcon,
  Building2
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

// Helper function to validate HTTP/HTTPS URLs and prevent XSS
const isValidHttpUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
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
          .select('id, country_code, location_name, status')
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
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage
              key={avatarKey}
              src={profile.avatar_url ? `${profile.avatar_url}?t=${avatarKey}` : ''}
              alt={profile.display_name || profile.username}
            />
            <AvatarFallback className="text-xl">
              {getInitials(profile.display_name || profile.username || '')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-4xl font-bold text-gray-900">
                {profile.display_name || profile.username}
              </h1>
              {/* Level Badge inline on desktop */}
              <Badge className={`text-xs ${getLevelBadgeColor(currentLevel)} hidden sm:inline-flex`}>
                Level {currentLevel} · {currentTitle}
              </Badge>
            </div>

            {profile.display_name && (
              <p className="text-gray-500 text-lg">@{profile.username}</p>
            )}

            {/* Level Badge below on mobile */}
            <Badge className={`text-xs ${getLevelBadgeColor(currentLevel)} sm:hidden mt-2 inline-flex`}>
              Level {currentLevel} · {currentTitle}
            </Badge>

            {profile.bio && (
              <p className="text-gray-700 mt-3 max-w-2xl">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}

              {profile.website && isValidHttpUrl(profile.website) && (
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link href="/profile/edit" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Link href="/settings" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats - Responsive Grid with Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/albums" className="group">
          <div className="text-center py-6 bg-white rounded-lg border hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-center mb-2">
              <Camera className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {loading ? '...' : stats.albums}
            </div>
            <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-600 transition-colors">Albums</div>
          </div>
        </Link>

        <Link href="/albums" className="group">
          <div className="text-center py-6 bg-white rounded-lg border hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-center mb-2">
              <ImageIcon className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {loading ? '...' : stats.photos}
            </div>
            <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-600 transition-colors">Photos</div>
          </div>
        </Link>

        <Link href="/globe" className="group">
          <div className="text-center py-6 bg-white rounded-lg border hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-center mb-2">
              <Globe className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {loading ? '...' : stats.countries}
            </div>
            <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-600 transition-colors">Countries</div>
          </div>
        </Link>

        <Link href="/globe" className="group">
          <div className="text-center py-6 bg-white rounded-lg border hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {loading ? '...' : stats.cities}
            </div>
            <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-600 transition-colors">Cities</div>
          </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStats()}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Prompts */}
      <ProfileCompletionPrompt profile={profile} />
      <FirstAlbumPrompt hasAlbums={stats.albums > 0} />

      {/* Missing Location Notification */}
      <MissingLocationNotification />

      {/* Monthly Highlights */}
      {!loading && (
        <MonthlyHighlights />
      )}

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
                <p className="text-sm text-gray-600">Who can see your profile and adventures</p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentAlbums.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              {recentAlbums.map((album) => {
                const coverPhotoUrl = album.cover_photo_url ? getPhotoUrl(album.cover_photo_url) : null

                return (
                  <Link key={album.id} href={`/albums/${album.id}`}>
                    <div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
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
                          <Camera className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
            <div className="text-center py-16 text-gray-500">
              <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base font-medium text-gray-700 mb-1">No albums yet</p>
              <p className="text-sm text-gray-500 mb-4">Start your adventure story today</p>
              <Link href="/albums/new">
                <Button size="sm" className="mt-2">
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
