'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Sparkles,
  Globe,
  Camera,
  MapPin,
  Calendar,
  Heart,
  Award,
  TrendingUp,
  Download,
  Share2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { motion, AnimatePresence } from 'framer-motion'

interface YearStats {
  year: number
  totalAlbums: number
  totalPhotos: number
  countriesVisited: number
  citiesVisited: number
  mostVisitedPlace?: string
  favoriteMonth?: string
  topPhotos: Array<{ id: string; url: string; caption?: string }>
  travelDays: number
  achievementUnlocked?: string
}

interface YearInReviewProps {
  userId: string
  year?: number
  trigger?: React.ReactNode
}

export function YearInReview({ userId, year = new Date().getFullYear(), trigger }: YearInReviewProps) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<YearStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (open && !stats) {
      generateYearInReview()
    }
  }, [open])

  const generateYearInReview = async () => {
    try {
      setLoading(true)

      // Fetch albums and photos for the year
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`

      const { data: albums, error } = await supabase
        .from('albums')
        .select(`
          *,
          photos(id, file_path, caption, likes:likes(count))
        `)
        .eq('user_id', userId)
        .gte('start_date', yearStart)
        .lte('start_date', yearEnd)

      if (error) throw error

      // Calculate statistics
      const countries = new Set<string>()
      const cities = new Set<string>()
      const locationCounts = new Map<string, number>()
      const monthCounts = new Map<number, number>()
      let totalPhotos = 0
      const allPhotos: any[] = []

      albums?.forEach((album) => {
        if (album.country_code) countries.add(album.country_code)
        if (album.location_name) {
          const city = album.location_name.split(',')[0]
          cities.add(city)

          const count = locationCounts.get(album.location_name) || 0
          locationCounts.set(album.location_name, count + 1)
        }

        if (album.start_date) {
          const month = new Date(album.start_date).getMonth()
          monthCounts.set(month, (monthCounts.get(month) || 0) + 1)
        }

        if (album.photos) {
          totalPhotos += album.photos.length
          allPhotos.push(...album.photos)
        }
      })

      // Find most visited place
      let mostVisitedPlace: string | undefined
      let maxVisits = 0
      locationCounts.forEach((count, location) => {
        if (count > maxVisits) {
          maxVisits = count
          mostVisitedPlace = location
        }
      })

      // Find favorite month
      let favoriteMonth: string | undefined
      let maxMonthVisits = 0
      monthCounts.forEach((count, month) => {
        if (count > maxMonthVisits) {
          maxMonthVisits = count
          favoriteMonth = new Date(year, month).toLocaleDateString('en-US', { month: 'long' })
        }
      })

      // Get top photos (by likes or random if no likes)
      const topPhotos = allPhotos
        .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
        .slice(0, 9)
        .map(p => ({
          id: p.id,
          url: getPhotoUrl(p.file_path) || '',
          caption: p.caption
        }))
        .filter(p => p.url)

      // Calculate travel days (estimate)
      const travelDays = albums?.reduce((total, album) => {
        if (album.start_date && album.end_date) {
          const start = new Date(album.start_date)
          const end = new Date(album.end_date)
          return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }
        return total + 1 // Default to 1 day if no end date
      }, 0) || 0

      // Determine achievement
      let achievementUnlocked: string | undefined
      if (countries.size >= 10) achievementUnlocked = '🌍 Globe Trotter'
      else if (totalPhotos >= 500) achievementUnlocked = '📸 Photographer'
      else if (albums && albums.length >= 20) achievementUnlocked = '✈️ Travel Enthusiast'
      else if (countries.size >= 5) achievementUnlocked = '🗺️ Explorer'

      setStats({
        year,
        totalAlbums: albums?.length || 0,
        totalPhotos,
        countriesVisited: countries.size,
        citiesVisited: cities.size,
        mostVisitedPlace,
        favoriteMonth,
        topPhotos,
        travelDays,
        achievementUnlocked
      })

      log.info('Year in review generated', {
        component: 'YearInReview',
        year,
        albumCount: albums?.length
      })
    } catch (error) {
      log.error('Failed to generate year in review', {
        component: 'YearInReview',
        year
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const slides = [
    // Slide 1: Welcome
    {
      title: `Your ${year} Travel Story`,
      content: (
        <div className="text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-blue-600" />
            </div>
          </div>
          <p className="text-lg text-gray-700">
            Let's look back at your amazing adventures this year!
          </p>
        </div>
      )
    },

    // Slide 2: Numbers
    {
      title: 'By The Numbers',
      content: stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-blue-100">
            <Globe className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-900">{stats.totalAlbums}</p>
            <p className="text-sm text-blue-700">Albums Created</p>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-purple-100">
            <Camera className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-900">{stats.totalPhotos}</p>
            <p className="text-sm text-purple-700">Photos Captured</p>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-green-100">
            <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-900">{stats.countriesVisited}</p>
            <p className="text-sm text-green-700">Countries Visited</p>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-orange-50 to-orange-100">
            <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-900">{stats.travelDays}</p>
            <p className="text-sm text-orange-700">Days Traveling</p>
          </Card>
        </div>
      )
    },

    // Slide 3: Favorites
    {
      title: 'Your Favorites',
      content: stats && (
        <div className="space-y-6">
          {stats.mostVisitedPlace && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-6 w-6 text-red-500" />
                <p className="text-sm font-semibold text-gray-700">Most Visited Place</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.mostVisitedPlace}</p>
            </div>
          )}
          {stats.favoriteMonth && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-purple-500" />
                <p className="text-sm font-semibold text-gray-700">Peak Travel Month</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.favoriteMonth}</p>
            </div>
          )}
        </div>
      )
    },

    // Slide 4: Top Photos
    {
      title: 'Your Best Moments',
      content: stats && stats.topPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats.topPhotos.map((photo, i) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
              <Image
                src={photo.url}
                alt={photo.caption || `Photo ${i + 1}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 33vw, 150px"
              />
            </div>
          ))}
        </div>
      )
    },

    // Slide 5: Achievement
    {
      title: 'Achievement Unlocked!',
      content: stats && stats.achievementUnlocked && (
        <div className="text-center space-y-6">
          <div className="relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Award className="h-20 w-20 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.achievementUnlocked}</p>
          <p className="text-gray-600">Keep exploring the world!</p>
        </div>
      )
    }
  ]

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            {year} Year in Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{year} Year in Review</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Creating your year in review...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Slide Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-[400px]"
              >
                <h3 className="text-2xl font-bold text-center mb-6 text-gray-900">
                  {slides[currentSlide].title}
                </h3>
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={prevSlide}
                disabled={currentSlide === 0}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentSlide
                        ? 'bg-blue-600 w-6'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
              >
                {currentSlide === slides.length - 1 ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500">
            <p>Unable to generate year in review</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
