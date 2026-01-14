'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Images,
  Globe2,
  Building2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'

interface TravelStats {
  totalAlbums: number
  totalPhotos: number
  totalCountries: number
  totalCities: number
  firstAlbum: {
    id: string
    title: string
    location_name: string
    start_date: string
    cover_photo?: {
      file_path: string
    }
  } | null
  latestAlbum: {
    id: string
    title: string
    location_name: string
    start_date: string
    cover_photo?: {
      file_path: string
    }
  } | null
  photosByYear: { year: string; count: number }[]
  topDestinations: {
    country_code: string
    country_name: string
    count: number
  }[]
  averagePhotosPerAlbum: number
  yearsOfAdventures: number
  countriesPerAlbum: number
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
            photos(id, file_path)
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

        // First and latest albums with photos
        const albumsWithPhotos = albums?.filter(a => a.photos && a.photos.length > 0) || []
        const firstAlbum = albumsWithPhotos.length > 0 ? {
          id: albumsWithPhotos[0].id,
          title: albumsWithPhotos[0].title,
          location_name: albumsWithPhotos[0].location_name || '',
          start_date: albumsWithPhotos[0].start_date || albumsWithPhotos[0].created_at,
          cover_photo: albumsWithPhotos[0].photos?.[0] ? {
            file_path: albumsWithPhotos[0].photos[0].file_path
          } : undefined
        } : null

        const latestAlbum = albumsWithPhotos.length > 0 ? {
          id: albumsWithPhotos[albumsWithPhotos.length - 1].id,
          title: albumsWithPhotos[albumsWithPhotos.length - 1].title,
          location_name: albumsWithPhotos[albumsWithPhotos.length - 1].location_name || '',
          start_date: albumsWithPhotos[albumsWithPhotos.length - 1].start_date || albumsWithPhotos[albumsWithPhotos.length - 1].created_at,
          cover_photo: albumsWithPhotos[albumsWithPhotos.length - 1].photos?.[0] ? {
            file_path: albumsWithPhotos[albumsWithPhotos.length - 1].photos[0].file_path
          } : undefined
        } : null

        // Photos by year
        const photosByYear: Record<string, number> = {}
        const currentYear = new Date().getFullYear()

        // Initialize years from 2020 to current year
        for (let year = 2020; year <= currentYear; year++) {
          photosByYear[year.toString()] = 0
        }

        photos?.forEach(photo => {
          const date = photo.taken_at || photo.created_at
          if (date) {
            const year = new Date(date).getFullYear().toString()
            if (photosByYear.hasOwnProperty(year)) {
              photosByYear[year] = (photosByYear[year] || 0) + 1
            }
          }
        })

        // Top destinations by country
        const countryCount: Record<string, number> = {}
        albums?.forEach(album => {
          if (album.country_code) {
            countryCount[album.country_code] = (countryCount[album.country_code] || 0) + 1
          }
        })

        const topDestinations = Object.entries(countryCount)
          .map(([country_code, count]) => ({
            country_code,
            country_name: getCountryName(country_code),
            count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Average photos per album
        const averagePhotosPerAlbum = totalAlbums > 0
          ? Math.round(totalPhotos / totalAlbums)
          : 0

        // Countries per album
        const countriesPerAlbum = totalAlbums > 0
          ? Math.round((totalCountries / totalAlbums) * 10) / 10
          : 0

        // Years of adventures
        const yearsSet = new Set<number>()
        albums?.forEach(album => {
          const date = album.start_date || album.created_at
          if (date) {
            yearsSet.add(new Date(date).getFullYear())
          }
        })
        const yearsOfAdventures = yearsSet.size

        setStats({
          totalAlbums,
          totalPhotos,
          totalCountries,
          totalCities,
          firstAlbum,
          latestAlbum,
          photosByYear: Object.entries(photosByYear)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year)),
          topDestinations,
          averagePhotosPerAlbum,
          yearsOfAdventures,
          countriesPerAlbum
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
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your travel insights...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Globe2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unable to load analytics</p>
        </div>
      </div>
    )
  }

  // Find the max count for bar chart scaling
  const maxPhotoCount = Math.max(...stats.photosByYear.map(y => y.count), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Travel Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">A summary of all your adventures.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Albums */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <ImageIcon className="h-8 w-8 text-teal-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalAlbums}</div>
            <div className="text-gray-600 text-sm mt-1">Total Albums</div>
          </div>

          {/* Total Photos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Images className="h-8 w-8 text-teal-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalPhotos.toLocaleString()}</div>
            <div className="text-gray-600 text-sm mt-1">Total Photos</div>
          </div>

          {/* Countries Visited */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Globe2 className="h-8 w-8 text-teal-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCountries}</div>
            <div className="text-gray-600 text-sm mt-1">Countries Visited</div>
          </div>

          {/* Cities Explored */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-8 w-8 text-teal-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCities}</div>
            <div className="text-gray-600 text-sm mt-1">Cities Explored</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Travel Journey and Activity Chart */}
          <div className="lg:col-span-2 space-y-8">
            {/* Your Travel Journey */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Travel Journey</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Adventure (or only adventure) */}
                {stats.firstAlbum && (
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="text-teal-600 text-sm font-medium mb-2">
                      {stats.latestAlbum?.id === stats.firstAlbum.id ? 'Your Adventure' : 'First Adventure'}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{stats.firstAlbum.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(stats.firstAlbum.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {stats.firstAlbum.cover_photo && (
                      <div className="relative h-32 w-full mb-3 rounded-lg overflow-hidden">
                        <Image
                          src={getPhotoUrl(stats.firstAlbum.cover_photo.file_path) || ''}
                          alt={stats.firstAlbum.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <Link href={`/albums/${stats.firstAlbum.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-teal-600 text-teal-600 hover:bg-teal-50"
                      >
                        View Album
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Latest Adventure - only show if different from first */}
                {stats.latestAlbum && stats.latestAlbum.id !== stats.firstAlbum?.id && (
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="text-teal-600 text-sm font-medium mb-2">Latest Adventure</div>
                    <h3 className="font-bold text-gray-900 mb-1">{stats.latestAlbum.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(stats.latestAlbum.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {stats.latestAlbum.cover_photo && (
                      <div className="relative h-32 w-full mb-3 rounded-lg overflow-hidden">
                        <Image
                          src={getPhotoUrl(stats.latestAlbum.cover_photo.file_path) || ''}
                          alt={stats.latestAlbum.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <Link href={`/albums/${stats.latestAlbum.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-teal-600 text-teal-600 hover:bg-teal-50"
                      >
                        View Album
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Your Activity Over Time */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Activity Over Time</h2>
              <p className="text-sm text-gray-600 mb-4">Photos Uploaded per Year</p>

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}>
                  {stats.photosByYear.map((yearData) => {
                    const heightPercentage = maxPhotoCount > 0 ? (yearData.count / maxPhotoCount) * 100 : 0
                    const isHighest = yearData.count === maxPhotoCount && yearData.count > 0

                    return (
                      <div key={yearData.year} className="flex-1 flex flex-col items-center justify-end">
                        <div className="text-xs text-gray-600 mb-2">{yearData.count || ''}</div>
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all duration-500",
                            isHighest ? "bg-teal-600" : "bg-teal-300"
                          )}
                          style={{ height: `${Math.max(heightPercentage, yearData.count > 0 ? 10 : 0)}%` }}
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  {stats.photosByYear.map((yearData) => (
                    <div key={yearData.year} className="flex-1 text-center">
                      <span className="text-xs text-gray-600">{yearData.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Top Destinations and Quick Stats */}
          <div className="space-y-8">
            {/* Top Destinations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Top Destinations</h2>

              <div className="space-y-4">
                {stats.topDestinations.map((destination, index) => (
                  <div key={destination.country_code} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getFlagEmoji(destination.country_code)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {destination.country_name}
                      </span>
                    </div>
                    <span className="text-gray-600 text-sm">
                      {destination.count} {destination.count === 1 ? 'Album' : 'Albums'}
                    </span>
                  </div>
                ))}

                {stats.topDestinations.length === 0 && (
                  <p className="text-gray-500 text-sm">No destinations yet</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Stats</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Avg. Photos per Album</span>
                  <span className="font-bold text-gray-900 text-xl">{stats.averagePhotosPerAlbum}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Countries per Album</span>
                  <span className="font-bold text-gray-900 text-xl">{stats.countriesPerAlbum}</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-600">Years of Adventures</span>
                  <span className="font-bold text-gray-900 text-xl">{stats.yearsOfAdventures}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}