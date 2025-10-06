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
import { ProfileCompletionPrompt } from '@/components/onboarding/ProfileCompletionPrompt'
import { FirstAlbumPrompt } from '@/components/onboarding/FirstAlbumPrompt'
import { MonthlyHighlights } from '@/components/dashboard/MonthlyHighlights'
import { instagramStyles } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

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
          user_id_param: user?.id
        })

      if (statsError) {
        log.warn('RPC function failed, falling back to manual queries', {
          component: 'DashboardPage',
          action: 'fetch-stats-fallback',
          error: statsError.message
        })

        // Fallback to original queries if RPC doesn't exist (exclude drafts)
        const [albumsResult, photosResult] = await Promise.all([
          supabase
            .from('albums')
            .select('id, country_code, location_name')
            .eq('user_id', user?.id)
            .neq('status', 'draft'),
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
          // Don't throw error for empty state - just return zeros
          setStats({
            totalAlbums: 0,
            totalPhotos: 0,
            countriesVisited: 0,
            citiesExplored: 0
          })
          setStatsLoading(false)
          return
        }

        if (photosResult.error) {
          log.error('Photos fallback query failed', {
            component: 'DashboardPage',
            action: 'fetch-photos-fallback',
            error: photosResult.error.message
          })
          // Don't throw error for empty state - just return zeros
          setStats({
            totalAlbums: 0,
            totalPhotos: 0,
            countriesVisited: 0,
            citiesExplored: 0
          })
          setStatsLoading(false)
          return
        }

        const albums = albumsResult.data || []
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

      const { data: recentAlbumsData, error: recentError} = await supabase
        .from('albums')
        .select(`
          *,
          photos:photos!album_id(id)
        `)
        .eq('user_id', user?.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentError) {
        log.warn('Recent albums query error', {
          component: 'DashboardPage',
          action: 'fetch-recent-albums',
          error: recentError.message
        })
        // Don't throw - just show empty state
        setRecentAlbums([])
        return
      }

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
      {/* Stories-style Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 p-0.5">
            <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Camera className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          {profileLoading || levelLoading ? (
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ) : (
            <div>
              <h1 className={cn(instagramStyles.text.heading, "text-xl")}>
                {profile?.name || user?.email?.split('@')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getLevelBadgeColor(currentLevel)}`}>
                  Level {currentLevel}
                </Badge>
                <span className={instagramStyles.text.caption}>
                  {currentTitle}
                </span>
              </div>
            </div>
          )}
        </div>
        <Link href="/albums/new">
          <Button size="sm" className={cn(instagramStyles.button.primary, "text-sm")}>
            <Plus className="h-4 w-4 mr-1" />
            New Album
          </Button>
        </Link>
      </div>

      {/* Stats Highlights (Instagram Stories Style) */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { icon: Camera, label: 'Albums', value: stats.totalAlbums, color: 'from-blue-500 to-blue-600' },
          { icon: Calendar, label: 'Photos', value: stats.totalPhotos, color: 'from-purple-500 to-purple-600' },
          { icon: Globe, label: 'Countries', value: stats.countriesVisited, color: 'from-green-500 to-green-600' },
          { icon: MapPin, label: 'Cities', value: stats.citiesExplored, color: 'from-orange-500 to-orange-600' }
        ].map((stat, index) => (
          <div key={index} className="flex-shrink-0">
            <div className={cn(
              "h-20 w-20 rounded-full bg-gradient-to-br p-0.5",
              stat.color
            )}>
              <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                <stat.icon className="h-5 w-5 text-gray-700 dark:text-gray-300 mb-1" />
                <div className={cn(instagramStyles.text.heading, "text-sm")}>
                  {statsLoading ? '...' : stat.value}
                </div>
              </div>
            </div>
            <p className={cn(instagramStyles.text.caption, "text-center mt-2 text-xs")}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Onboarding Prompts */}
      <ProfileCompletionPrompt profile={profile} />
      <FirstAlbumPrompt hasAlbums={stats.totalAlbums > 0} />

      {/* Missing Location Notification */}
      <MissingLocationNotification />

      {/* Monthly Highlights */}
      {!statsLoading && !error && (
        <MonthlyHighlights />
      )}

      {/* Error State */}
      {error && (
        <div className={cn(instagramStyles.card, "border-red-200 bg-red-50 dark:bg-red-900/20 p-6")}>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load dashboard data</p>
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>
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
        </div>
      )}

      {/* Quick Actions - Instagram Style */}
      {!statsLoading && !error && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          <Link href="/albums/new" className="flex-shrink-0">
            <div className={cn(
              instagramStyles.card,
              "p-4 text-center hover:shadow-md transition-all duration-200",
              instagramStyles.interactive.hover
            )}>
              <div className="h-12 w-12 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className={cn(instagramStyles.text.caption, "font-medium")}>New Album</p>
            </div>
          </Link>

          <Link href="/search" className="flex-shrink-0">
            <div className={cn(
              instagramStyles.card,
              "p-4 text-center hover:shadow-md transition-all duration-200",
              instagramStyles.interactive.hover
            )}>
              <div className="h-12 w-12 mx-auto mb-2 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className={cn(instagramStyles.text.caption, "font-medium")}>Search</p>
            </div>
          </Link>

          <Link href="/globe" className="flex-shrink-0">
            <div className={cn(
              instagramStyles.card,
              "p-4 text-center hover:shadow-md transition-all duration-200",
              instagramStyles.interactive.hover
            )}>
              <div className="h-12 w-12 mx-auto mb-2 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className={cn(instagramStyles.text.caption, "font-medium")}>Globe</p>
            </div>
          </Link>
        </div>
      )}

      {/* Empty State for New Users */}
      {!statsLoading && !error && stats.totalAlbums === 0 && (
        <div className={cn(instagramStyles.card, "text-center py-16")}>
          <div className="max-w-md mx-auto">
            <div className="h-24 w-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Camera className="h-12 w-12 text-white" />
            </div>
            <h2 className={cn(instagramStyles.text.heading, "text-2xl mb-3")}>
              Welcome to Adventure Log!
            </h2>
            <p className={cn(instagramStyles.text.muted, "text-lg mb-6")}>
              Start your journey by creating your first album to showcase your travels and adventures.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/albums/new">
                <Button size="lg" className={instagramStyles.button.primary}>
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Album
                </Button>
              </Link>
              <Link href="/search">
                <Button size="lg" variant="outline">
                  <Globe className="mr-2 h-5 w-5" />
                  Explore Others
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Albums - Instagram Grid */}
      {(!statsLoading && !error && stats.totalAlbums > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn(instagramStyles.text.heading, "text-lg")}>
              Recent Albums
            </h2>
            <Link href="/albums">
              <Button variant="ghost" size="sm" className={instagramStyles.text.caption}>
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
            <div className={cn(instagramStyles.card, "text-center py-12")}>
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className={cn(instagramStyles.text.heading, "text-lg mb-2")}>No albums yet</h3>
              <p className={cn(instagramStyles.text.muted, "mb-4")}>
                Start by creating your first album to showcase your travels
              </p>
              <Link href="/albums/new">
                <Button className={instagramStyles.button.primary}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Album
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {recentAlbums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className={cn(
                    "relative aspect-square rounded-lg overflow-hidden",
                    instagramStyles.interactive.hover,
                    "group"
                  )}>
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className={cn(
                          instagramStyles.photoGrid,
                          "group-hover:scale-110 transition-transform duration-300"
                        )}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-end">
                      <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-white text-xs font-medium truncate">
                          {album.title}
                        </p>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <span>{album.photos?.length || 0} photos</span>
                          {(album.location_name || album.country_code) && (
                            <>
                              <span>•</span>
                              <span className="truncate">{album.location_name || album.country_code}</span>
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