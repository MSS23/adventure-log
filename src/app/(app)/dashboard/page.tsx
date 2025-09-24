'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/charts'
import { TravelAchievements } from '@/components/dashboard/TravelAchievements'
import { TravelInsights } from '@/components/dashboard/TravelInsights'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { TravelWeatherPlanner } from '@/components/weather/TravelWeatherPlanner'
import { Camera, Globe, MapPin, Plus, TrendingUp, Calendar, Eye, Sparkles, Award, Target } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Album } from '@/types/database'
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
        return <Eye className="h-3 w-3 text-gray-800" />
      default:
        return <Eye className="h-3 w-3 text-gray-800" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {profileLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-8 w-8 text-yellow-500" />
                  Welcome back, {profile?.display_name || profile?.username || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-800 mt-2">
                  Here&apos;s what&apos;s happening with your adventures
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Level {Math.floor(stats.countriesVisited / 5) + 1} Explorer
                </Badge>
                {stats.totalAlbums > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {stats.totalAlbums} Adventures
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Enhanced Stats Grid */}
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
          <StatCard
            title="Total Albums"
            value={stats.totalAlbums}
            subtitle={stats.totalAlbums === 0 ? 'Create your first album' : 'Your adventure collections'}
            icon={<Camera className="h-5 w-5" />}
            gradient="from-blue-500 to-indigo-600"
            trend={stats.totalAlbums > 0 ? { value: 12, isPositive: true } : undefined}
          />

          <StatCard
            title="Photos Uploaded"
            value={stats.totalPhotos}
            subtitle={stats.totalPhotos === 0 ? 'Start capturing memories' : 'Memories preserved'}
            icon={<TrendingUp className="h-5 w-5" />}
            gradient="from-green-500 to-emerald-600"
            trend={stats.totalPhotos > 0 ? { value: 8, isPositive: true } : undefined}
          />

          <StatCard
            title="Countries Visited"
            value={stats.countriesVisited}
            subtitle={stats.countriesVisited === 0 ? 'Plan your next trip' : 'Destinations explored'}
            icon={<Globe className="h-5 w-5" />}
            gradient="from-purple-500 to-violet-600"
            trend={stats.countriesVisited > 0 ? { value: 5, isPositive: true } : undefined}
          />

          <StatCard
            title="Cities Explored"
            value={stats.citiesExplored}
            subtitle={stats.citiesExplored === 0 ? 'Add locations to albums' : 'Urban adventures'}
            icon={<MapPin className="h-5 w-5" />}
            gradient="from-orange-500 to-red-500"
            trend={stats.citiesExplored > 0 ? { value: 15, isPositive: true } : undefined}
          />
        </div>
      )}


      {/* Enhanced Dashboard Components */}
      {!statsLoading && !error && (
        <>
          {/* Travel Insights and Achievements Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <TravelInsights stats={stats} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TravelAchievements stats={stats} />
            </motion.div>
          </div>

          {/* Enhanced Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <QuickActions
              onUploadClick={() => {
                // Handle upload click - could open a modal or navigate
                window.location.href = '/albums'
              }}
              onSearchClick={() => {
                // Handle search click - could focus search or open explore
                window.location.href = '/albums'
              }}
            />
          </motion.div>

          {/* Weather Planning Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <TravelWeatherPlanner />
          </motion.div>
        </>
      )}

      {/* Recent Albums */}
      {(!statsLoading && !error && stats.totalAlbums > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Recent Albums</CardTitle>
            <CardDescription className="text-gray-800">Your latest travel memories</CardDescription>
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
            <div className="text-center py-8 text-gray-700">
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
                        <Camera className="h-6 w-6 text-gray-800" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {album.title}
                        </h3>
                        <Badge
                          variant={album.visibility === 'public' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 text-sm"
                        >
                          {getVisibilityIcon(album.visibility)}
                          <span className="capitalize">{album.visibility}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-800">
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
                        <p className="text-sm text-gray-800 line-clamp-1 mt-1">
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
        </motion.div>
      )}
    </div>
  )
}