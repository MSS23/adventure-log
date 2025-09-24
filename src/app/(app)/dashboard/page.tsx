'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Globe, MapPin, Plus, TrendingUp, Calendar, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { DashboardOnboarding } from '@/components/onboarding/DashboardOnboarding'
import { log } from '@/lib/utils/logger'

interface DashboardStats {
  totalAlbums: number
  totalPhotos: number
  countriesVisited: number
  citiesExplored: number
}

export default function DashboardPage() {
  const { profile, user, profileLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAlbums: 0,
    totalPhotos: 0,
    countriesVisited: 0,
    citiesExplored: 0
  })
  const [statsInitialized, setStatsInitialized] = useState(false)
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentAlbumsLoading, setRecentAlbumsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setError(null)

      // Optimized single query to get all stats at once using SQL aggregation
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_dashboard_stats', {
          user_id_param: user?.id
        })

      if (statsError) {
        log.warn('RPC function failed, falling back to manual queries', {
          component: 'DashboardPage',
          action: 'fetch-stats-fallback',
          error: statsError.message
        })

        // Fallback to original queries if RPC doesn't exist
        const [albumsResult, photosResult] = await Promise.all([
          supabase
            .from('albums')
            .select('id, country_id, city_id')
            .eq('user_id', user?.id),
          supabase
            .from('photos')
            .select('id')
            .eq('user_id', user?.id)
        ])

        if (albumsResult.error) {
          log.error('Albums fallback query failed', {
            component: 'DashboardPage',
            action: 'fetch-albums-fallback',
            error: albumsResult.error.message
          })
          throw albumsResult.error
        }

        if (photosResult.error) {
          log.error('Photos fallback query failed', {
            component: 'DashboardPage',
            action: 'fetch-photos-fallback',
            error: photosResult.error.message
          })
          throw photosResult.error
        }

        const albums = albumsResult.data || []
        const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id))
        const uniqueCities = new Set(albums.filter(a => a.city_id).map(a => a.city_id))

        const fallbackStats = {
          totalAlbums: albums.length,
          totalPhotos: photosResult.data?.length || 0,
          countriesVisited: uniqueCountries.size,
          citiesExplored: uniqueCities.size
        }

        log.info('Fallback stats calculated successfully', {
          component: 'DashboardPage',
          action: 'fetch-stats-fallback-success',
          stats: fallbackStats
        })

        setStats(fallbackStats)
        setStatsInitialized(true)
      } else {
        // Use optimized RPC result
        const rpcStats = statsData || {
          totalAlbums: 0,
          totalPhotos: 0,
          countriesVisited: 0,
          citiesExplored: 0
        }

        log.info('RPC stats loaded successfully', {
          component: 'DashboardPage',
          action: 'fetch-stats-rpc-success',
          stats: rpcStats
        })

        setStats(rpcStats)
        setStatsInitialized(true)
      }
    } catch (err) {
      log.error('Dashboard stats fetch failed', {
        component: 'DashboardPage',
        action: 'fetch-stats',
        userId: user?.id
      }, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
    } finally {
      setStatsLoading(false)
    }
  }, [user?.id, supabase])

  const fetchRecentAlbums = useCallback(async () => {
    try {
      setRecentAlbumsLoading(true)

      const { data: recentAlbumsData, error: recentError } = await supabase
        .from('albums')
        .select(`
          *,
          photos(id)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentError) throw recentError

      setRecentAlbums(recentAlbumsData || [])
    } catch (err) {
      log.warn('Recent albums fetch failed', {
        component: 'DashboardPage',
        action: 'fetch-recent-albums',
        userId: user?.id
      }, err)
      // Don't set error for recent albums as it's not critical
    } finally {
      setRecentAlbumsLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
      fetchRecentAlbums()
    }
  }, [user, fetchDashboardStats, fetchRecentAlbums])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3 text-green-600" />
      case 'friends':
        return <Camera className="h-3 w-3 text-blue-600" />
      case 'private':
        return <Eye className="h-3 w-3 text-gray-600" />
      default:
        return <Eye className="h-3 w-3 text-gray-600" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        {profileLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.display_name || profile?.username || user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here&apos;s what&apos;s happening with your adventures
            </p>
          </>
        )}
      </div>

      {/* Quick Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Failed to load dashboard data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  fetchDashboardStats()
                  fetchRecentAlbums()
                }}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Albums</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Camera className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAlbums}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.totalAlbums === 0
                  ? 'Create your first album'
                  : 'Your adventure collections'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Photos Uploaded</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPhotos}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.totalPhotos === 0
                  ? 'Start capturing memories'
                  : 'Memories preserved'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Countries Visited</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.countriesVisited}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.countriesVisited === 0
                  ? 'Plan your next trip'
                  : 'Destinations explored'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Cities Explored</CardTitle>
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.citiesExplored}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.citiesExplored === 0
                  ? 'Add locations to albums'
                  : 'Urban adventures'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding for New Users */}
      {!statsLoading && !profileLoading && !error && statsInitialized && stats.totalAlbums === 0 && user && (
        <DashboardOnboarding />
      )}

      {/* Quick Actions */}
      {(!statsLoading && !error && stats.totalAlbums > 0) && (
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900">Quick Actions</CardTitle>
          <CardDescription className="text-gray-600">Get started with your next adventure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/albums/new">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all duration-200">
                <Plus className="mr-2 h-4 w-4" />
                Create Album
              </Button>
            </Link>
            <Link href="/globe">
              <Button variant="outline" className="border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                <Globe className="mr-2 h-4 w-4" />
                View Globe
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                <Camera className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Recent Albums */}
      {(!statsLoading && !error && stats.totalAlbums > 0) && (
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Recent Albums</CardTitle>
            <CardDescription className="text-gray-600">Your latest travel memories</CardDescription>
          </div>
          {recentAlbums.length > 0 && (
            <Link href="/albums">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {recentAlbumsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentAlbums.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No albums yet</p>
              <p className="text-sm mb-4">Start by creating your first album to showcase your travels</p>
              <Link href="/albums/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Album
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAlbums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {album.cover_photo_url ? (
                        <Image
                          src={album.cover_photo_url}
                          alt={album.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Camera className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {album.title}
                        </h3>
                        <Badge
                          variant={album.visibility === 'public' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 text-xs"
                        >
                          {getVisibilityIcon(album.visibility)}
                          <span className="capitalize">{album.visibility}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {album.location_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{album.location_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          <span>{album.photos?.length || 0} photos</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(album.created_at)}</span>
                        </div>
                      </div>

                      {album.description && (
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}