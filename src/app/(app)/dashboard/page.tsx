'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Globe, MapPin, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { useUserLevels } from '@/lib/hooks/useUserLevels'
import { MissingLocationNotification } from '@/components/notifications/MissingLocationNotification'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalAlbums: number
  totalPhotos: number
  countriesVisited: number
  citiesExplored: number
}

export default function DashboardPage() {
  const { profile, user, profileLoading } = useAuth()
  const { currentLevel, currentTitle, getLevelBadgeColor, loading: levelLoading } = useUserLevels()
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
          p_user_id: user?.id
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

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-pink-400 via-purple-500 to-indigo-500 p-1">
            <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          {profileLoading || levelLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile?.display_name || profile?.username || user?.email?.split('@')[0]}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`text-sm font-semibold ${getLevelBadgeColor(currentLevel)}`}>
                  Level {currentLevel}
                </Badge>
                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {currentTitle}
                </span>
              </div>
            </div>
          )}
        </div>
        <Link href="/albums/new">
          <Button size="default" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6">
            <Plus className="h-4 w-4 mr-2" />
            New Album
          </Button>
        </Link>
      </div>

      {/* Stats Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Camera, label: 'Albums', value: stats.totalAlbums, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: Calendar, label: 'Photos', value: stats.totalPhotos, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
          { icon: Globe, label: 'Countries', value: stats.countriesVisited, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
          { icon: MapPin, label: 'Cities', value: stats.citiesExplored, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20' }
        ].map((stat, index) => (
          <div key={index} className={cn(
            "bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-800 group cursor-pointer",
            stat.bgColor
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
                stat.color
              )}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading ? (
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Missing Location Notification */}
      <MissingLocationNotification />

      {/* Error State */}
      {error && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to load dashboard</h3>
            <p className="text-red-500 dark:text-red-400 text-sm mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                fetchDashboardStats()
                fetchRecentAlbums()
              }}
              className="bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!statsLoading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link href="/albums/new">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-800 group cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="h-14 w-14 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-7 w-7 text-white" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">New Album</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Create adventure</p>
            </div>
          </Link>

          <Link href="/search">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-800 group cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="h-14 w-14 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Search</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Find memories</p>
            </div>
          </Link>

          <Link href="/globe">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-800 group cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="h-14 w-14 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-7 w-7 text-white" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Globe</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Explore world</p>
            </div>
          </Link>
        </div>
      )}

      {/* Recent Albums - Instagram Grid */}
      {(!statsLoading && !error && stats.totalAlbums > 0) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Albums
            </h2>
            <Link href="/albums">
              <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors duration-200">
                View All
              </Button>
            </Link>
          </div>

          {recentAlbumsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : recentAlbums.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                <Camera className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No albums yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                Start by creating your first album to showcase your travels and adventures
              </p>
              <Link href="/albums/new">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-8">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Album
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {recentAlbums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    {album.cover_photo_url ? (
                      <Image
                        src={album.cover_photo_url}
                        alt={album.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                        <Camera className="h-10 w-10 text-gray-400" />
                      </div>
                    )}

                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                      <div className="p-3 w-full">
                        <p className="text-white text-sm font-semibold truncate mb-1">
                          {album.title}
                        </p>
                        <div className="flex items-center gap-2 text-white/90 text-xs">
                          <span>{album.photos?.length || 0} photos</span>
                          {album.location_name && (
                            <>
                              <span>•</span>
                              <span className="truncate">{album.location_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}