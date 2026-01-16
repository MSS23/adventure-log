'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Images,
  Globe2,
  Building2,
  Loader2,
  Sparkles,
  TrendingUp,
  MapPin,
  Calendar
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

// Animated counter component
function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
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
        setCount(Math.floor(current))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration, prefersReducedMotion])

  return <span>{count.toLocaleString()}</span>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<TravelStats | null>(null)
  const [loading, setLoading] = useState(true)
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
  }

  const headerVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-solid border-teal-200 border-t-teal-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-600 font-medium">Loading your travel insights...</p>
        </motion.div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <Globe2 className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-gray-600">Unable to load analytics</p>
        </motion.div>
      </div>
    )
  }

  // Find the max count for bar chart scaling
  const maxPhotoCount = Math.max(...stats.photosByYear.map(y => y.count), 1)

  // Stats card configuration
  const statsCards = [
    { icon: ImageIcon, value: stats.totalAlbums, label: 'Total Albums', gradient: 'from-teal-500/10 to-cyan-500/10', iconColor: 'text-teal-600', iconBg: 'from-teal-100 to-cyan-100' },
    { icon: Images, value: stats.totalPhotos, label: 'Total Photos', gradient: 'from-purple-500/10 to-pink-500/10', iconColor: 'text-purple-600', iconBg: 'from-purple-100 to-pink-100' },
    { icon: Globe2, value: stats.totalCountries, label: 'Countries Visited', gradient: 'from-blue-500/10 to-indigo-500/10', iconColor: 'text-blue-600', iconBg: 'from-blue-100 to-indigo-100' },
    { icon: Building2, value: stats.totalCities, label: 'Cities Explored', gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-600', iconBg: 'from-amber-100 to-orange-100' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Title */}
        <motion.div
          className="mb-8"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Your Travel Analytics
            {!prefersReducedMotion && stats.totalAlbums > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
              >
                <Sparkles className="h-6 w-6 text-amber-400" />
              </motion.div>
            )}
          </h1>
          <p className="text-gray-600 mt-1">A summary of all your adventures.</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {statsCards.map((card, index) => (
            <motion.div
              key={card.label}
              variants={itemVariants}
              className={cn(
                "rounded-2xl p-6 relative overflow-hidden group",
                "bg-gradient-to-br from-white/95 to-white/80",
                "backdrop-blur-xl border border-white/50",
                "shadow-lg hover:shadow-xl transition-shadow duration-300"
              )}
              whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Background gradient */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", card.gradient)} />

              <div className="relative">
                <motion.div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
                    "bg-gradient-to-br shadow-md",
                    card.iconBg
                  )}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <card.icon className={cn("h-7 w-7", card.iconColor)} />
                </motion.div>
                <div className="text-4xl font-bold text-gray-900">
                  <AnimatedCounter value={card.value} duration={0.8 + index * 0.1} />
                </div>
                <div className="text-gray-600 text-sm mt-1 font-medium">{card.label}</div>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Travel Journey and Activity Chart */}
          <div className="lg:col-span-2 space-y-8">
            {/* Your Travel Journey */}
            <motion.div
              className={cn(
                "rounded-2xl p-6 overflow-hidden",
                "bg-gradient-to-br from-white/95 to-white/80",
                "backdrop-blur-xl border border-white/50",
                "shadow-xl shadow-black/5"
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-500" />
                Your Travel Journey
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Adventure (or only adventure) */}
                {stats.firstAlbum && (
                  <motion.div
                    className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-100"
                    whileHover={prefersReducedMotion ? {} : { y: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center gap-2 text-teal-600 text-sm font-semibold mb-3">
                      <Calendar className="h-4 w-4" />
                      {stats.latestAlbum?.id === stats.firstAlbum.id ? 'Your Adventure' : 'First Adventure'}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{stats.firstAlbum.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {new Date(stats.firstAlbum.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {stats.firstAlbum.cover_photo && (
                      <div className="relative h-36 w-full mb-4 rounded-lg overflow-hidden group">
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
                      <motion.div
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all rounded-lg"
                        >
                          View Album
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                )}

                {/* Latest Adventure - only show if different from first */}
                {stats.latestAlbum && stats.latestAlbum.id !== stats.firstAlbum?.id && (
                  <motion.div
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100"
                    whileHover={prefersReducedMotion ? {} : { y: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center gap-2 text-purple-600 text-sm font-semibold mb-3">
                      <Sparkles className="h-4 w-4" />
                      Latest Adventure
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{stats.latestAlbum.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {new Date(stats.latestAlbum.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {stats.latestAlbum.cover_photo && (
                      <div className="relative h-36 w-full mb-4 rounded-lg overflow-hidden group">
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
                      <motion.div
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 transition-all rounded-lg"
                        >
                          View Album
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Your Activity Over Time */}
            <motion.div
              className={cn(
                "rounded-2xl p-6",
                "bg-gradient-to-br from-white/95 to-white/80",
                "backdrop-blur-xl border border-white/50",
                "shadow-xl shadow-black/5"
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Your Activity Over Time
              </h2>
              <p className="text-sm text-gray-600 mb-6">Photos Uploaded per Year</p>

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3" style={{ height: '220px' }}>
                  {stats.photosByYear.map((yearData, index) => {
                    const heightPercentage = maxPhotoCount > 0 ? (yearData.count / maxPhotoCount) * 100 : 0
                    const isHighest = yearData.count === maxPhotoCount && yearData.count > 0

                    return (
                      <motion.div
                        key={yearData.year}
                        className="flex-1 flex flex-col items-center justify-end group"
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                      >
                        <motion.div
                          className="text-xs text-gray-600 mb-2 font-medium"
                          initial={prefersReducedMotion ? {} : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 + index * 0.05 }}
                        >
                          {yearData.count || ''}
                        </motion.div>
                        <motion.div
                          className={cn(
                            "w-full rounded-t-lg transition-all duration-300",
                            isHighest
                              ? "bg-gradient-to-t from-teal-600 to-cyan-400 shadow-lg shadow-teal-500/30"
                              : "bg-gradient-to-t from-teal-400 to-teal-300 group-hover:from-teal-500 group-hover:to-teal-400"
                          )}
                          initial={prefersReducedMotion ? { height: `${Math.max(heightPercentage, yearData.count > 0 ? 10 : 0)}%` } : { height: 0 }}
                          animate={{ height: `${Math.max(heightPercentage, yearData.count > 0 ? 10 : 0)}%` }}
                          transition={{
                            type: 'spring',
                            stiffness: 100,
                            damping: 15,
                            delay: 0.6 + index * 0.08
                          }}
                        />
                      </motion.div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  {stats.photosByYear.map((yearData) => (
                    <div key={yearData.year} className="flex-1 text-center">
                      <span className="text-xs text-gray-500 font-medium">{yearData.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Top Destinations and Quick Stats */}
          <div className="space-y-8">
            {/* Top Destinations */}
            <motion.div
              className={cn(
                "rounded-2xl p-6",
                "bg-gradient-to-br from-white/95 to-white/80",
                "backdrop-blur-xl border border-white/50",
                "shadow-xl shadow-black/5"
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-indigo-500" />
                Top Destinations
              </h2>

              <div className="space-y-4">
                {stats.topDestinations.map((destination, index) => (
                  <motion.div
                    key={destination.country_code}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 transition-colors"
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.08 }}
                    whileHover={prefersReducedMotion ? {} : { x: 4 }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.span
                        className="text-2xl"
                        initial={prefersReducedMotion ? {} : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.7 + index * 0.08 }}
                      >
                        {getFlagEmoji(destination.country_code)}
                      </motion.span>
                      <span className="font-medium text-gray-900">
                        {destination.country_name}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm font-medium px-2.5 py-1 bg-white rounded-full">
                      {destination.count} {destination.count === 1 ? 'Album' : 'Albums'}
                    </span>
                  </motion.div>
                ))}

                {stats.topDestinations.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No destinations yet</p>
                )}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              className={cn(
                "rounded-2xl p-6",
                "bg-gradient-to-br from-white/95 to-white/80",
                "backdrop-blur-xl border border-white/50",
                "shadow-xl shadow-black/5"
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.6 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Quick Stats
              </h2>

              <div className="space-y-1">
                {[
                  { label: 'Avg. Photos per Album', value: stats.averagePhotosPerAlbum },
                  { label: 'Countries per Album', value: stats.countriesPerAlbum },
                  { label: 'Years of Adventures', value: stats.yearsOfAdventures },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.08 }}
                  >
                    <span className="text-gray-600">{stat.label}</span>
                    <span className="font-bold text-2xl text-gray-900">
                      <AnimatedCounter value={stat.value} duration={1 + index * 0.2} />
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
