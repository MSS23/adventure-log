'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Camera,
  TrendingUp,
  Globe,
  Award,
  BarChart3,
  Plane,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import { log } from '@/lib/utils/logger'

interface TravelStats {
  totalAlbums: number
  totalPhotos: number
  totalCountries: number
  totalCities: number
  firstTripDate: string | null
  lastTripDate: string | null
  favoriteCountry: { country: string; count: number } | null
  photosByYear: { year: string; count: number }[]
  topDestinations: { location: string; count: number }[]
  albumsByMonth: { month: string; count: number }[]
  averagePhotosPerAlbum: number
  longestTrip: { album: string; days: number } | null
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<TravelStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchAnalytics = async () => {
      try {
        setLoading(true)

        // Fetch all albums with photos
        const { data: albums, error: albumsError } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            location_name,
            country_code,
            start_date,
            end_date,
            created_at,
            photos(id)
          `)
          .eq('user_id', user.id)
          .order('start_date', { ascending: true })

        if (albumsError) throw albumsError

        // Fetch all photos for detailed stats
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select('id, taken_at, created_at, album_id')
          .eq('user_id', user.id)

        if (photosError) throw photosError

        // Calculate statistics
        const totalAlbums = albums?.length || 0
        const totalPhotos = photos?.length || 0

        // Unique countries
        const countries = new Set(
          albums?.filter(a => a.country_code).map(a => a.country_code) || []
        )
        const totalCountries = countries.size

        // Unique cities
        const cities = new Set(
          albums?.filter(a => a.location_name).map(a => a.location_name) || []
        )
        const totalCities = cities.size

        // Date range
        const albumsWithDates = albums?.filter(a => a.start_date) || []
        const firstTripDate = albumsWithDates.length > 0
          ? albumsWithDates[0].start_date
          : null
        const lastTripDate = albumsWithDates.length > 0
          ? albumsWithDates[albumsWithDates.length - 1].start_date
          : null

        // Favorite country (most albums)
        const countryCount: Record<string, number> = {}
        albums?.forEach(album => {
          if (album.country_code) {
            countryCount[album.country_code] = (countryCount[album.country_code] || 0) + 1
          }
        })
        const favoriteCountry = Object.entries(countryCount).length > 0
          ? Object.entries(countryCount).reduce((a, b) => a[1] > b[1] ? a : b)
          : null

        // Photos by year
        const photosByYear: Record<string, number> = {}
        photos?.forEach(photo => {
          const date = photo.taken_at || photo.created_at
          if (date) {
            const year = new Date(date).getFullYear().toString()
            photosByYear[year] = (photosByYear[year] || 0) + 1
          }
        })

        // Top destinations (by number of albums)
        const locationCount: Record<string, number> = {}
        albums?.forEach(album => {
          if (album.location_name) {
            locationCount[album.location_name] = (locationCount[album.location_name] || 0) + 1
          }
        })
        const topDestinations = Object.entries(locationCount)
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Albums by month
        const albumsByMonth: Record<string, number> = {}
        albums?.forEach(album => {
          const date = album.start_date || album.created_at
          if (date) {
            const month = new Date(date).toLocaleDateString('en-US', { month: 'short' })
            albumsByMonth[month] = (albumsByMonth[month] || 0) + 1
          }
        })

        // Average photos per album
        const averagePhotosPerAlbum = totalAlbums > 0
          ? Math.round(totalPhotos / totalAlbums)
          : 0

        // Longest trip (by date range)
        let longestTrip: { album: string; days: number } | null = null
        albums?.forEach(album => {
          if (album.start_date && album.end_date) {
            const start = new Date(album.start_date)
            const end = new Date(album.end_date)
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            if (!longestTrip || days > longestTrip.days) {
              longestTrip = { album: album.title, days }
            }
          }
        })

        setStats({
          totalAlbums,
          totalPhotos,
          totalCountries,
          totalCities,
          firstTripDate,
          lastTripDate,
          favoriteCountry: favoriteCountry
            ? { country: favoriteCountry[0], count: favoriteCountry[1] }
            : null,
          photosByYear: Object.entries(photosByYear)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year)),
          topDestinations,
          albumsByMonth: Object.entries(albumsByMonth)
            .map(([month, count]) => ({ month, count })),
          averagePhotosPerAlbum,
          longestTrip
        })

        log.info('Analytics loaded successfully', {
          component: 'AnalyticsPage',
          userId: user.id,
          totalAlbums,
          totalCountries
        })
      } catch (error) {
        log.error('Failed to load analytics', {
          component: 'AnalyticsPage',
          userId: user?.id,
          error
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your travel insights...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unable to load analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center h-14 px-4 max-w-7xl mx-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-4">Travel Analytics</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Analytics Hero Section */}
        <Card className={cn(instagramStyles.card, "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white overflow-hidden")}>
          <CardContent className="pt-6">
            <div className="relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-8 w-8" />
                  <h2 className="text-2xl font-bold">Your Travel Analytics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Albums</p>
                    <p className="text-4xl font-black">{stats.totalAlbums}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Photos</p>
                    <p className="text-4xl font-black">{stats.totalPhotos}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90 mb-1">Countries Visited</p>
                    <p className="text-4xl font-black">{stats.totalCountries}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90 mb-1">Cities Explored</p>
                    <p className="text-4xl font-black">{stats.totalCities}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Journey */}
        <Card className={instagramStyles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Your Travel Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">First Adventure</p>
                <p className="text-lg font-semibold">
                  {stats.firstTripDate
                    ? new Date(stats.firstTripDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'No trips yet'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Latest Adventure</p>
                <p className="text-lg font-semibold">
                  {stats.lastTripDate
                    ? new Date(stats.lastTripDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'No trips yet'}
                </p>
              </div>
            </div>

            {stats.longestTrip && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Longest Trip</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{stats.longestTrip.album}</p>
                  <Badge variant="secondary">{stats.longestTrip.days} days</Badge>
                </div>
              </div>
            )}

            {stats.favoriteCountry && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Favorite Destination</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{stats.favoriteCountry.country}</p>
                  <Badge variant="secondary">{stats.favoriteCountry.count} albums</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Destinations */}
        {stats.topDestinations.length > 0 && (
          <Card className={instagramStyles.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Destinations
              </CardTitle>
              <CardDescription>
                Places you&apos;ve visited most frequently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topDestinations.map((dest, index) => (
                  <div key={dest.location} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-100 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-50 text-gray-600"
                      )}>
                        {index + 1}
                      </div>
                      <p className="font-medium">{dest.location}</p>
                    </div>
                    <Badge variant="secondary">{dest.count} albums</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos by Year */}
        {stats.photosByYear.length > 0 && (
          <Card className={instagramStyles.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Photos Over Time
              </CardTitle>
              <CardDescription>
                Your photography journey by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.photosByYear.map((yearData) => {
                  const maxCount = Math.max(...stats.photosByYear.map(y => y.count))
                  const percentage = (yearData.count / maxCount) * 100

                  return (
                    <div key={yearData.year} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{yearData.year}</span>
                        <span className="text-gray-600">{yearData.count} photos</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card className={instagramStyles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.averagePhotosPerAlbum}</p>
                <p className="text-sm text-gray-600 mt-1">Avg. Photos per Album</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalAlbums > 0 ? Math.round(stats.totalCountries / stats.totalAlbums * 10) / 10 : 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Countries per Album</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {stats.photosByYear.length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Years of Adventures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {stats.totalAlbums === 0 && (
          <Card className={cn(instagramStyles.card, "text-center py-12")}>
            <CardContent>
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
              <p className="text-gray-600 mb-6">
                Start creating albums to see your travel analytics!
              </p>
              <Link href="/albums/new">
                <Button className={instagramStyles.button.primary}>
                  <Camera className="h-4 w-4 mr-2" />
                  Create Your First Album
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
