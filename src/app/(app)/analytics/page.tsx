'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Images,
  Globe2,
  Building2,
  Sparkles,
  TrendingUp,
  MapPin,
  Calendar,
  Camera,
  Heart,
  MessageCircle,
  Users,
  Award,
  Route,
  BarChart3,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface TravelStats {
  totalAlbums: number
  totalPhotos: number
  totalCountries: number
  totalCities: number
  totalDistance: number
  avgTripDuration: number
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
  // Enhanced: Heatmap calendar data
  heatmapData: Record<string, number>
  // Enhanced: Timeline data
  timeline: {
    id: string
    title: string
    location_name: string
    start_date: string
    end_date?: string
    photo_count: number
    country_code?: string
  }[]
  // Enhanced: Photo stats
  topCameras: { name: string; count: number }[]
  photosByMonth: { month: string; count: number }[]
  // Enhanced: Social stats
  followerCount: number
  followingCount: number
  mostLikedAlbum: { id: string; title: string; like_count: number } | null
  mostCommentedAlbum: { id: string; title: string; comment_count: number } | null
  totalLikes: number
  totalComments: number
}

// Animated counter component
function AnimatedCounter({ value, duration = 1, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [count, setCount] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(value)
      return
    }

    const step = value / (duration * 60)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration, prefersReducedMotion, decimals])

  return <span>{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}</span>
}

// Heatmap calendar component
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function TravelHeatmap({ data, year }: { data: Record<string, number>; year: number }) {
  const prefersReducedMotion = useReducedMotion()
  const months = MONTH_LABELS
  const days = ['Mon', '', 'Wed', '', 'Fri', '', '']

  // Generate all dates for the year
  const cells = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number; week: number }[] = []
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    const firstDayOffset = (startDate.getDay() + 6) % 7 // Monday = 0

    let weekIndex = 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = (d.getDay() + 6) % 7 // Monday = 0
      const dayOfYear = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      weekIndex = Math.floor((dayOfYear + firstDayOffset) / 7)

      result.push({
        date: dateStr,
        count: data[dateStr] || 0,
        dayOfWeek,
        week: weekIndex,
      })
    }
    return result
  }, [data, year])

  const maxCount = Math.max(...Object.values(data), 1)
  const totalWeeks = cells.length > 0 ? cells[cells.length - 1].week + 1 : 53

  function getIntensityClass(count: number): string {
    if (count === 0) return 'bg-stone-100 dark:bg-[#1A1A1A]'
    const ratio = count / maxCount
    if (ratio > 0.75) return 'bg-olive-600 dark:bg-olive-500'
    if (ratio > 0.5) return 'bg-olive-500 dark:bg-olive-600'
    if (ratio > 0.25) return 'bg-olive-400 dark:bg-olive-700'
    return 'bg-olive-200 dark:bg-olive-800'
  }

  // Calculate month label positions
  const monthPositions = useMemo(() => {
    const positions: { month: string; week: number }[] = []
    let lastMonth = -1
    for (const cell of cells) {
      const month = new Date(cell.date).getMonth()
      if (month !== lastMonth) {
        positions.push({ month: months[month], week: cell.week })
        lastMonth = month
      }
    }
    return positions
  }, [cells])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        {/* Month labels */}
        <div className="flex mb-1 ml-8">
          {monthPositions.map((m, i) => (
            <div
              key={`${m.month}-${i}`}
              className="text-xs text-stone-500 dark:text-stone-400"
              style={{
                position: 'relative',
                left: `${(m.week / totalWeeks) * 100}%`,
                width: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {m.month}
            </div>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1 text-xs text-stone-400 dark:text-stone-500">
            {days.map((day, i) => (
              <div key={i} className="h-[13px] flex items-center justify-end pr-1 w-6">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px] flex-1">
            {Array.from({ length: totalWeeks }, (_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const cell = cells.find(
                    (c) => c.week === weekIdx && c.dayOfWeek === dayIdx
                  )
                  if (!cell) {
                    return <div key={dayIdx} className="w-[13px] h-[13px]" />
                  }
                  return (
                    <motion.div
                      key={dayIdx}
                      className={cn(
                        'w-[13px] h-[13px] rounded-[2px] transition-colors',
                        getIntensityClass(cell.count)
                      )}
                      title={`${cell.date}: ${cell.count} ${cell.count === 1 ? 'activity' : 'activities'}`}
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: weekIdx * 0.005,
                        type: 'spring',
                        stiffness: 500,
                        damping: 25,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-stone-500 dark:text-stone-400">
          <span>Less</span>
          <div className="w-[13px] h-[13px] rounded-[2px] bg-stone-100 dark:bg-[#1A1A1A]" />
          <div className="w-[13px] h-[13px] rounded-[2px] bg-olive-200 dark:bg-olive-800" />
          <div className="w-[13px] h-[13px] rounded-[2px] bg-olive-400 dark:bg-olive-700" />
          <div className="w-[13px] h-[13px] rounded-[2px] bg-olive-500 dark:bg-olive-600" />
          <div className="w-[13px] h-[13px] rounded-[2px] bg-olive-600 dark:bg-olive-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<TravelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
  const prefersReducedMotion = useReducedMotion()

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
            latitude,
            longitude,
            start_date,
            end_date,
            created_at,
            photos(id, file_path, taken_at, created_at, camera_make, camera_model, exif_data)
          `)
          .eq('user_id', user.id)
          .order('start_date', { ascending: true })

        if (albumsError) throw albumsError

        // Fetch all photos for detailed stats
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select('id, taken_at, created_at, album_id, camera_make, camera_model')
          .eq('user_id', user.id)

        if (photosError) throw photosError

        // Fetch social stats
        const [likesResult, commentsResult, followersResult, followingResult] = await Promise.all([
          supabase
            .from('likes')
            .select('id, target_id, target_type')
            .eq('target_type', 'album')
            .in('target_id', (albums || []).map((a) => a.id)),
          supabase
            .from('comments')
            .select('id, target_id, target_type')
            .eq('target_type', 'album')
            .in('target_id', (albums || []).map((a) => a.id)),
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.id)
            .eq('status', 'accepted'),
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id)
            .eq('status', 'accepted'),
        ])

        // Calculate statistics
        const totalAlbums = albums?.length || 0
        const totalPhotos = photos?.length || 0

        // Unique countries
        const countries = new Set(
          albums?.filter((a) => a.country_code).map((a) => a.country_code) || []
        )
        const totalCountries = countries.size

        // Unique cities
        const cities = new Set(
          albums?.filter((a) => a.location_name).map((a) => a.location_name) || []
        )
        const totalCities = cities.size

        // Calculate total distance (approximate using Haversine)
        let totalDistance = 0
        const sortedAlbums = [...(albums || [])].sort(
          (a, b) => new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime()
        )
        for (let i = 1; i < sortedAlbums.length; i++) {
          const prev = sortedAlbums[i - 1]
          const curr = sortedAlbums[i]
          if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
            totalDistance += haversineDistance(
              prev.latitude,
              prev.longitude,
              curr.latitude,
              curr.longitude
            )
          }
        }

        // Average trip duration
        let totalTripDays = 0
        let tripsWithDuration = 0
        albums?.forEach((album) => {
          if (album.start_date && album.end_date) {
            const start = new Date(album.start_date)
            const end = new Date(album.end_date)
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            if (days > 0 && days < 365) {
              totalTripDays += days
              tripsWithDuration++
            }
          }
        })
        const avgTripDuration = tripsWithDuration > 0 ? Math.round(totalTripDays / tripsWithDuration) : 0

        // First and latest albums with photos
        const albumsWithPhotos = albums?.filter((a) => a.photos && a.photos.length > 0) || []
        const firstAlbum =
          albumsWithPhotos.length > 0
            ? {
                id: albumsWithPhotos[0].id,
                title: albumsWithPhotos[0].title,
                location_name: albumsWithPhotos[0].location_name || '',
                start_date: albumsWithPhotos[0].start_date || albumsWithPhotos[0].created_at,
                cover_photo: albumsWithPhotos[0].photos?.[0]
                  ? { file_path: albumsWithPhotos[0].photos[0].file_path }
                  : undefined,
              }
            : null

        const latestAlbum =
          albumsWithPhotos.length > 0
            ? {
                id: albumsWithPhotos[albumsWithPhotos.length - 1].id,
                title: albumsWithPhotos[albumsWithPhotos.length - 1].title,
                location_name: albumsWithPhotos[albumsWithPhotos.length - 1].location_name || '',
                start_date:
                  albumsWithPhotos[albumsWithPhotos.length - 1].start_date ||
                  albumsWithPhotos[albumsWithPhotos.length - 1].created_at,
                cover_photo: albumsWithPhotos[albumsWithPhotos.length - 1].photos?.[0]
                  ? {
                      file_path:
                        albumsWithPhotos[albumsWithPhotos.length - 1].photos[0].file_path,
                    }
                  : undefined,
              }
            : null

        // Photos by year
        const photosByYear: Record<string, number> = {}
        const currentYear = new Date().getFullYear()
        for (let year = 2020; year <= currentYear; year++) {
          photosByYear[year.toString()] = 0
        }

        photos?.forEach((photo) => {
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
        albums?.forEach((album) => {
          if (album.country_code) {
            countryCount[album.country_code] = (countryCount[album.country_code] || 0) + 1
          }
        })

        const topDestinations = Object.entries(countryCount)
          .map(([country_code, count]) => ({
            country_code,
            country_name: getCountryName(country_code),
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        const averagePhotosPerAlbum = totalAlbums > 0 ? Math.round(totalPhotos / totalAlbums) : 0
        const countriesPerAlbum =
          totalAlbums > 0 ? Math.round((totalCountries / totalAlbums) * 10) / 10 : 0

        const yearsSet = new Set<number>()
        albums?.forEach((album) => {
          const date = album.start_date || album.created_at
          if (date) {
            yearsSet.add(new Date(date).getFullYear())
          }
        })
        const yearsOfAdventures = yearsSet.size

        // Heatmap data - count photos/albums per day
        const heatmapData: Record<string, number> = {}
        albums?.forEach((album) => {
          if (album.start_date) {
            const startDate = new Date(album.start_date)
            const endDate = album.end_date ? new Date(album.end_date) : startDate
            for (
              let d = new Date(startDate);
              d <= endDate;
              d.setDate(d.getDate() + 1)
            ) {
              const key = d.toISOString().split('T')[0]
              heatmapData[key] = (heatmapData[key] || 0) + 1
            }
          }
        })
        photos?.forEach((photo) => {
          const date = photo.taken_at || photo.created_at
          if (date) {
            const key = new Date(date).toISOString().split('T')[0]
            heatmapData[key] = (heatmapData[key] || 0) + 1
          }
        })

        // Timeline data
        const timeline = (albums || [])
          .filter((a) => a.start_date)
          .sort(
            (a, b) =>
              new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime()
          )
          .slice(0, 20)
          .map((a) => ({
            id: a.id,
            title: a.title,
            location_name: a.location_name || '',
            start_date: a.start_date!,
            end_date: a.end_date || undefined,
            photo_count: a.photos?.length || 0,
            country_code: a.country_code || undefined,
          }))

        // Camera stats
        const cameraCount: Record<string, number> = {}
        photos?.forEach((photo) => {
          const camera = photo.camera_make && photo.camera_model
            ? `${photo.camera_make} ${photo.camera_model}`
            : photo.camera_make || photo.camera_model
          if (camera) {
            cameraCount[camera] = (cameraCount[camera] || 0) + 1
          }
        })
        // Also check exif_data in album photos
        albums?.forEach((album) => {
          album.photos?.forEach((photo: { exif_data?: { camera?: { make?: string; model?: string } } }) => {
            if (photo.exif_data?.camera) {
              const cam = photo.exif_data.camera
              const camera = cam.make && cam.model
                ? `${cam.make} ${cam.model}`
                : cam.make || cam.model
              if (camera && !cameraCount[camera]) {
                // Don't double-count
              }
            }
          })
        })

        const topCameras = Object.entries(cameraCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Photos by month
        const monthCount: Record<string, number> = {}
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthNames.forEach((m) => (monthCount[m] = 0))
        photos?.forEach((photo) => {
          const date = photo.taken_at || photo.created_at
          if (date) {
            const month = monthNames[new Date(date).getMonth()]
            monthCount[month] = (monthCount[month] || 0) + 1
          }
        })
        const photosByMonth = monthNames.map((month) => ({ month, count: monthCount[month] }))

        // Social stats - likes and comments per album
        const likesPerAlbum: Record<string, number> = {}
        const commentsPerAlbum: Record<string, number> = {}
        ;(likesResult.data || []).forEach((like) => {
          likesPerAlbum[like.target_id] = (likesPerAlbum[like.target_id] || 0) + 1
        })
        ;(commentsResult.data || []).forEach((comment) => {
          commentsPerAlbum[comment.target_id] = (commentsPerAlbum[comment.target_id] || 0) + 1
        })

        const albumLikes = Object.entries(likesPerAlbum)
          .map(([id, count]) => ({
            id,
            title: albums?.find((a) => a.id === id)?.title || 'Unknown',
            like_count: count,
          }))
          .sort((a, b) => b.like_count - a.like_count)

        const albumComments = Object.entries(commentsPerAlbum)
          .map(([id, count]) => ({
            id,
            title: albums?.find((a) => a.id === id)?.title || 'Unknown',
            comment_count: count,
          }))
          .sort((a, b) => b.comment_count - a.comment_count)

        setStats({
          totalAlbums,
          totalPhotos,
          totalCountries,
          totalCities,
          totalDistance: Math.round(totalDistance),
          avgTripDuration,
          firstAlbum,
          latestAlbum,
          photosByYear: Object.entries(photosByYear)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year)),
          topDestinations,
          averagePhotosPerAlbum,
          yearsOfAdventures,
          countriesPerAlbum,
          heatmapData,
          timeline,
          topCameras,
          photosByMonth,
          followerCount: followersResult.count || 0,
          followingCount: followingResult.count || 0,
          mostLikedAlbum: albumLikes[0] || null,
          mostCommentedAlbum: albumComments[0] || null,
          totalLikes: likesResult.data?.length || 0,
          totalComments: commentsResult.data?.length || 0,
        })

        log.info('Analytics loaded successfully', {
          component: 'AnalyticsPage',
          userId: user.id,
          totalAlbums,
          totalCountries,
        })
      } catch (error) {
        log.error('Failed to load analytics', {
          component: 'AnalyticsPage',
          userId: user?.id,
          error,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, supabase])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  }

  const headerVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
    },
  }

  const isAuthLoading = authLoading || profileLoading

  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-olive-950/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-stone-400" />
          </div>
          <p className="text-stone-600 dark:text-stone-400 mb-4">Please log in to view your analytics</p>
          <Link href="/login">
            <Button className="bg-olive-500 hover:bg-olive-600 text-white">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-olive-950/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-solid border-olive-200 dark:border-olive-800 border-t-olive-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-stone-600 dark:text-stone-400 font-medium">Loading your travel insights...</p>
        </motion.div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-olive-950/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center mx-auto mb-4">
            <Globe2 className="h-10 w-10 text-stone-400" />
          </div>
          <p className="text-stone-600 dark:text-stone-400">Unable to load analytics</p>
        </motion.div>
      </div>
    )
  }

  const maxPhotoCount = Math.max(...stats.photosByYear.map((y) => y.count), 1)
  const maxMonthCount = Math.max(...stats.photosByMonth.map((m) => m.count), 1)
  const maxCountryCount = Math.max(...stats.topDestinations.map((d) => d.count), 1)
  const worldPercentage = Math.round((stats.totalCountries / 195) * 100 * 10) / 10

  const statsCards = [
    {
      icon: ImageIcon,
      value: stats.totalAlbums,
      label: 'Total Albums',
      gradient: 'from-olive-500/10 to-olive-500/10',
      iconColor: 'text-olive-600 dark:text-olive-400',
      iconBg: 'from-olive-100 to-olive-100 dark:from-olive-900/50 dark:to-olive-900/50',
    },
    {
      icon: Images,
      value: stats.totalPhotos,
      label: 'Total Photos',
      gradient: 'from-olive-500/10 to-pink-500/10',
      iconColor: 'text-olive-600 dark:text-olive-400',
      iconBg: 'from-olive-100 to-pink-100 dark:from-olive-900/50 dark:to-pink-900/50',
    },
    {
      icon: Globe2,
      value: stats.totalCountries,
      label: 'Countries Visited',
      gradient: 'from-olive-500/10 to-olive-500/10',
      iconColor: 'text-olive-600 dark:text-olive-400',
      iconBg: 'from-olive-100 to-olive-100 dark:from-olive-900/50 dark:to-olive-900/50',
    },
    {
      icon: Building2,
      value: stats.totalCities,
      label: 'Cities Explored',
      gradient: 'from-olive-500/10 to-olive-500/10',
      iconColor: 'text-olive-600 dark:text-olive-400',
      iconBg: 'from-olive-100 to-olive-100 dark:from-olive-900/50 dark:to-olive-900/50',
    },
    {
      icon: Route,
      value: stats.totalDistance,
      label: 'km Traveled',
      gradient: 'from-emerald-500/10 to-olive-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'from-emerald-100 to-olive-100 dark:from-emerald-900/50 dark:to-olive-900/50',
    },
    {
      icon: Clock,
      value: stats.avgTripDuration,
      label: 'Avg. Days per Trip',
      gradient: 'from-olive-500/10 to-olive-500/10',
      iconColor: 'text-olive-600 dark:text-olive-400',
      iconBg: 'from-olive-100 to-olive-100 dark:from-olive-900/50 dark:to-olive-900/50',
    },
  ]

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-olive-950/30">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Title */}
        <motion.div
          className="mb-8"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white flex items-center gap-3">
            Your Travel Analytics
            {!prefersReducedMotion && stats.totalAlbums > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
              >
                <Sparkles className="h-6 w-6 text-olive-400" />
              </motion.div>
            )}
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">A comprehensive summary of all your adventures.</p>
        </motion.div>

        {/* Section 1: Travel Overview - Stats Cards */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {statsCards.map((card, index) => (
            <motion.div
              key={card.label}
              variants={itemVariants}
              className={cn(
                'rounded-2xl p-4 relative overflow-hidden group',
                'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
                'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
                'shadow-lg hover:shadow-xl transition-shadow duration-300'
              )}
              whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
              <div className="relative">
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                    'bg-gradient-to-br shadow-md',
                    card.iconBg
                  )}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <card.icon className={cn('h-5 w-5', card.iconColor)} />
                </motion.div>
                <div className="text-2xl font-bold text-stone-900 dark:text-white">
                  <AnimatedCounter value={card.value} duration={0.8 + index * 0.1} />
                </div>
                <div className="text-stone-600 dark:text-stone-400 text-xs mt-1 font-medium">{card.label}</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>

        {/* Section 2: Travel Heatmap Calendar */}
        <motion.div
          className={cn(
            'rounded-2xl p-6 mb-8',
            'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
            'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
            'shadow-xl shadow-black/5'
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-olive-500" />
              Travel Activity
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeatmapYear((y) => y - 1)}
                className="h-8 px-2 text-xs dark:border-stone-600 dark:text-stone-300"
              >
                &larr;
              </Button>
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 min-w-[3rem] text-center">
                {heatmapYear}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeatmapYear((y) => Math.min(y + 1, new Date().getFullYear()))}
                disabled={heatmapYear >= new Date().getFullYear()}
                className="h-8 px-2 text-xs dark:border-stone-600 dark:text-stone-300"
              >
                &rarr;
              </Button>
            </div>
          </div>
          <TravelHeatmap data={stats.heatmapData} year={heatmapYear} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 3: Country Statistics */}
            <motion.div
              className={cn(
                'rounded-2xl p-6',
                'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
                'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
                'shadow-xl shadow-black/5'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-olive-500" />
                  Country Statistics
                </h2>
                <div className="text-right">
                  <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
                    {worldPercentage}%
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">of the world</p>
                </div>
              </div>

              <div className="space-y-3">
                {stats.topDestinations.map((destination, index) => {
                  const widthPercent = (destination.count / maxCountryCount) * 100

                  return (
                    <motion.div
                      key={destination.country_code}
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.08 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getFlagEmoji(destination.country_code)}
                          </span>
                          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                            {destination.country_name}
                          </span>
                        </div>
                        <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                          {destination.count} {destination.count === 1 ? 'album' : 'albums'}
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            index === 0
                              ? 'bg-gradient-to-r from-olive-500 to-olive-400'
                              : 'bg-gradient-to-r from-olive-400 to-olive-300 dark:from-olive-600 dark:to-olive-500'
                          )}
                          initial={prefersReducedMotion ? { width: `${widthPercent}%` } : { width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.5 + index * 0.1,
                            ease: 'easeOut',
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
                {stats.topDestinations.length === 0 && (
                  <p className="text-stone-500 dark:text-stone-400 text-sm text-center py-4">
                    No country data yet
                  </p>
                )}
              </div>
            </motion.div>

            {/* Section 5: Photo Statistics */}
            <motion.div
              className={cn(
                'rounded-2xl p-6',
                'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
                'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
                'shadow-xl shadow-black/5'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
            >
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                <Camera className="h-5 w-5 text-olive-500" />
                Photo Statistics
              </h2>

              {/* Photos per month */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-3">
                  Photos per Month
                </h3>
                <div className="flex items-end justify-between gap-1" style={{ height: '120px' }}>
                  {stats.photosByMonth.map((monthData, index) => {
                    const heightPercent =
                      maxMonthCount > 0
                        ? (monthData.count / maxMonthCount) * 100
                        : 0

                    return (
                      <div
                        key={monthData.month}
                        className="flex-1 flex flex-col items-center justify-end group"
                      >
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {monthData.count || ''}
                        </div>
                        <motion.div
                          className="w-full rounded-t bg-gradient-to-t from-olive-500 to-olive-300 dark:from-olive-600 dark:to-olive-400 group-hover:from-olive-600 group-hover:to-olive-400"
                          initial={
                            prefersReducedMotion
                              ? { height: `${Math.max(heightPercent, monthData.count > 0 ? 8 : 0)}%` }
                              : { height: 0 }
                          }
                          animate={{
                            height: `${Math.max(heightPercent, monthData.count > 0 ? 8 : 0)}%`,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 100,
                            damping: 15,
                            delay: 0.5 + index * 0.05,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 dark:border-white/[0.1] pt-2 mt-1">
                  {stats.photosByMonth.map((monthData) => (
                    <div key={monthData.month} className="flex-1 text-center">
                      <span className="text-[10px] text-stone-400 dark:text-stone-500">
                        {monthData.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Camera stats and average */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">
                    Most Used Cameras
                  </h3>
                  {stats.topCameras.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topCameras.slice(0, 3).map((cam, i) => (
                        <div key={cam.name} className="flex items-center justify-between">
                          <span className="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 mr-2">
                            {i === 0 && <Award className="h-3.5 w-3.5 text-olive-400 inline mr-1" />}
                            {cam.name}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                            {cam.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 dark:text-stone-500">No camera data</p>
                  )}
                </div>
                <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">
                    Quick Stats
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-600 dark:text-stone-300">Avg. per Album</span>
                      <span className="text-sm font-bold text-stone-900 dark:text-white">
                        {stats.averagePhotosPerAlbum}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-600 dark:text-stone-300">Years Active</span>
                      <span className="text-sm font-bold text-stone-900 dark:text-white">
                        {stats.yearsOfAdventures}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-600 dark:text-stone-300">Countries/Album</span>
                      <span className="text-sm font-bold text-stone-900 dark:text-white">
                        {stats.countriesPerAlbum}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Section 6: Social Stats */}
            <motion.div
              className={cn(
                'rounded-2xl p-6',
                'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
                'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
                'shadow-xl shadow-black/5'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
            >
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Social Stats
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-olive-50 to-olive-50 dark:from-olive-900/30 dark:to-olive-900/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-olive-700 dark:text-olive-400">
                    <AnimatedCounter value={stats.followerCount} />
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Followers</p>
                </div>
                <div className="bg-gradient-to-br from-olive-50 to-pink-50 dark:from-olive-900/30 dark:to-pink-900/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-olive-700 dark:text-olive-400">
                    <AnimatedCounter value={stats.followingCount} />
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Following</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-white/[0.1]">
                  <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-400" />
                    Total Likes
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white">
                    {stats.totalLikes}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-white/[0.1]">
                  <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-olive-400" />
                    Total Comments
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white">
                    {stats.totalComments}
                  </span>
                </div>
                {stats.totalAlbums > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-white/[0.1]">
                    <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                      Engagement Rate
                    </span>
                    <span className="text-sm font-bold text-stone-900 dark:text-white">
                      {(
                        ((stats.totalLikes + stats.totalComments) /
                          stats.totalAlbums) *
                        100 /
                        Math.max(stats.followerCount, 1)
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Most liked album */}
              {stats.mostLikedAlbum && (
                <div className="mt-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Most Liked
                  </p>
                  <Link
                    href={`/albums/${stats.mostLikedAlbum.id}`}
                    className="text-sm font-medium text-stone-900 dark:text-white hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
                  >
                    {stats.mostLikedAlbum.title}
                  </Link>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {stats.mostLikedAlbum.like_count} likes
                  </p>
                </div>
              )}

              {/* Most commented album */}
              {stats.mostCommentedAlbum && (
                <div className="mt-3 bg-gradient-to-br from-olive-50 to-olive-50 dark:from-olive-900/20 dark:to-olive-900/20 rounded-xl p-3">
                  <p className="text-xs text-olive-600 dark:text-olive-400 font-semibold mb-1 flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> Most Discussed
                  </p>
                  <Link
                    href={`/albums/${stats.mostCommentedAlbum.id}`}
                    className="text-sm font-medium text-stone-900 dark:text-white hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
                  >
                    {stats.mostCommentedAlbum.title}
                  </Link>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {stats.mostCommentedAlbum.comment_count} comments
                  </p>
                </div>
              )}
            </motion.div>

            {/* Your Travel Journey */}
            <motion.div
              className={cn(
                'rounded-2xl p-6 overflow-hidden',
                'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
                'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
                'shadow-xl shadow-black/5'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.6 }}
            >
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-olive-500" />
                Journey Milestones
              </h2>

              {stats.firstAlbum && (
                <motion.div
                  className="bg-gradient-to-br from-olive-50 to-olive-50 dark:from-olive-900/30 dark:to-olive-900/30 rounded-xl p-4 border border-olive-100 dark:border-olive-800/50 mb-4"
                  whileHover={prefersReducedMotion ? {} : { y: -2 }}
                >
                  <div className="flex items-center gap-2 text-olive-600 dark:text-olive-400 text-xs font-semibold mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {stats.latestAlbum?.id === stats.firstAlbum.id
                      ? 'Your Adventure'
                      : 'First Adventure'}
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-white text-sm mb-1">
                    {stats.firstAlbum.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                    {new Date(stats.firstAlbum.start_date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {stats.firstAlbum.cover_photo && (
                    <div className="relative h-28 w-full mb-3 rounded-lg overflow-hidden group">
                      <Image
                        src={getPhotoUrl(stats.firstAlbum.cover_photo.file_path) || ''}
                        alt={stats.firstAlbum.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                  )}
                  <Link href={`/albums/${stats.firstAlbum.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-olive-300 text-olive-700 hover:bg-olive-100 dark:border-olive-700 dark:text-olive-400 dark:hover:bg-olive-900/30 rounded-lg"
                    >
                      View Album
                    </Button>
                  </Link>
                </motion.div>
              )}

              {stats.latestAlbum && stats.latestAlbum.id !== stats.firstAlbum?.id && (
                <motion.div
                  className="bg-gradient-to-br from-olive-50 to-pink-50 dark:from-olive-900/30 dark:to-pink-900/30 rounded-xl p-4 border border-olive-100 dark:border-olive-800/50"
                  whileHover={prefersReducedMotion ? {} : { y: -2 }}
                >
                  <div className="flex items-center gap-2 text-olive-600 dark:text-olive-400 text-xs font-semibold mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Latest Adventure
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-white text-sm mb-1">
                    {stats.latestAlbum.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                    {new Date(stats.latestAlbum.start_date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {stats.latestAlbum.cover_photo && (
                    <div className="relative h-28 w-full mb-3 rounded-lg overflow-hidden group">
                      <Image
                        src={getPhotoUrl(stats.latestAlbum.cover_photo.file_path) || ''}
                        alt={stats.latestAlbum.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                  )}
                  <Link href={`/albums/${stats.latestAlbum.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-olive-300 text-olive-700 hover:bg-olive-100 dark:border-olive-700 dark:text-olive-400 dark:hover:bg-olive-900/30 rounded-lg"
                    >
                      View Album
                    </Button>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Section 4: Travel Timeline */}
        <motion.div
          className={cn(
            'rounded-2xl p-6 mb-8',
            'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
            'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
            'shadow-xl shadow-black/5'
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
        >
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-olive-500" />
            Travel Timeline
          </h2>

          {stats.timeline.length > 0 ? (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-olive-400 via-olive-400 to-olive-400 dark:from-olive-600 dark:via-olive-600 dark:to-olive-600" />

              <div className="space-y-6">
                {stats.timeline.map((trip, index) => {
                  const startDate = new Date(trip.start_date)
                  const endDate = trip.end_date ? new Date(trip.end_date) : null
                  const duration = endDate
                    ? Math.ceil(
                        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    : null

                  return (
                    <motion.div
                      key={trip.id}
                      className="relative pl-10"
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-[#1A1A1A] border-2 border-olive-500 dark:border-olive-400 z-10" />

                      <Link href={`/albums/${trip.id}`}>
                        <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-stone-900 dark:text-white group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors truncate">
                                {trip.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {trip.country_code && (
                                  <span className="text-sm">
                                    {getFlagEmoji(trip.country_code)}
                                  </span>
                                )}
                                <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {trip.location_name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {startDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {duration && duration > 0 && (
                                  <span className="text-xs text-olive-600 dark:text-olive-400">
                                    {duration}d
                                  </span>
                                )}
                                <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-0.5">
                                  <Images className="h-3 w-3" />
                                  {trip.photo_count}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-stone-500 dark:text-stone-400 text-sm text-center py-8">
              No trips with dates recorded yet. Add dates to your albums to see your timeline.
            </p>
          )}
        </motion.div>

        {/* Activity Over Time (existing bar chart) */}
        <motion.div
          className={cn(
            'rounded-2xl p-6',
            'bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-800/95 dark:to-stone-800/80',
            'backdrop-blur-xl border border-white/50 dark:border-white/[0.1]/50',
            'shadow-xl shadow-black/5'
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.6 }}
        >
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-olive-500" />
            Your Activity Over Time
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">Photos Uploaded per Year</p>

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3" style={{ height: '220px' }}>
              {stats.photosByYear.map((yearData, index) => {
                const heightPercentage =
                  maxPhotoCount > 0 ? (yearData.count / maxPhotoCount) * 100 : 0
                const isHighest = yearData.count === maxPhotoCount && yearData.count > 0

                return (
                  <motion.div
                    key={yearData.year}
                    className="flex-1 flex flex-col items-center justify-end group"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <motion.div
                      className="text-xs text-stone-600 dark:text-stone-400 mb-2 font-medium"
                      initial={prefersReducedMotion ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 + index * 0.05 }}
                    >
                      {yearData.count || ''}
                    </motion.div>
                    <motion.div
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-300',
                        isHighest
                          ? 'bg-gradient-to-t from-olive-600 to-olive-400 shadow-lg shadow-olive-500/30'
                          : 'bg-gradient-to-t from-olive-400 to-olive-300 dark:from-olive-600 dark:to-olive-500 group-hover:from-olive-500 group-hover:to-olive-400'
                      )}
                      initial={
                        prefersReducedMotion
                          ? {
                              height: `${Math.max(heightPercentage, yearData.count > 0 ? 10 : 0)}%`,
                            }
                          : { height: 0 }
                      }
                      animate={{
                        height: `${Math.max(heightPercentage, yearData.count > 0 ? 10 : 0)}%`,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 100,
                        damping: 15,
                        delay: 0.8 + index * 0.08,
                      }}
                    />
                  </motion.div>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 dark:border-white/[0.1] pt-3">
              {stats.photosByYear.map((yearData) => (
                <div key={yearData.year} className="flex-1 text-center">
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {yearData.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
    </ErrorBoundary>
  )
}

/**
 * Calculate the Haversine distance between two points on Earth in km
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
