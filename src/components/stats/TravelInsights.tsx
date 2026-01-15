'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Globe, Camera, MapPin, Plane, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Animated counter component
function AnimatedValue({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  const [displayValue, setDisplayValue] = useState(0)

  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value

  useEffect(() => {
    if (!isInView || typeof value === 'string') return

    const duration = 1200
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(numericValue * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [numericValue, isInView, value])

  if (typeof value === 'string') {
    return <span ref={ref}>{value}</span>
  }

  return (
    <span ref={ref}>
      {displayValue.toLocaleString()}{suffix}
    </span>
  )
}

interface TravelStats {
  totalCountries: number
  totalCities: number
  totalPhotos: number
  totalDistance: number
  mostVisitedContinent: string
}

export function TravelInsights() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<TravelStats>({
    totalCountries: 0,
    totalCities: 0,
    totalPhotos: 0,
    totalDistance: 0,
    mostVisitedContinent: 'N/A'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      calculateStats()
    }
  }, [user])

  // Calculate distance between two coordinates using Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in kilometers
  }

  async function calculateStats() {
    if (!user) return

    const supabase = createClient()

    try {
      // Get albums with location data
      const { data: albums } = await supabase
        .from('albums')
        .select('id, country_code, location_name, latitude, longitude, created_at')
        .eq('user_id', user.id)

      // Get photos count
      const { count: photosCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .in('album_id', (albums || []).map(a => a.id))

      if (!albums || albums.length === 0) {
        setLoading(false)
        return
      }

      // Calculate countries
      const countries = new Set(albums.filter(a => a.country_code).map(a => a.country_code))
      const totalCountries = countries.size

      // Calculate cities (approximate from location_name)
      const cities = new Set(
        albums
          .filter(a => a.location_name)
          .map(a => a.location_name?.split(',')[0]?.trim())
      )
      const totalCities = cities.size

      // Calculate total distance traveled
      let totalDistance = 0
      const locationsWithCoords = albums.filter(a => a.latitude && a.longitude)

      // If user has set home location, calculate distance from home to each destination
      if (profile?.home_latitude && profile?.home_longitude && locationsWithCoords.length > 0) {
        locationsWithCoords.forEach(location => {
          totalDistance += calculateDistance(
            profile.home_latitude!,
            profile.home_longitude!,
            location.latitude!,
            location.longitude!
          )
        })
      } else if (locationsWithCoords.length > 1) {
        // Fallback: Calculate distance between consecutive trips if no home location
        for (let i = 0; i < locationsWithCoords.length - 1; i++) {
          const current = locationsWithCoords[i]
          const next = locationsWithCoords[i + 1]
          totalDistance += calculateDistance(
            current.latitude!,
            current.longitude!,
            next.latitude!,
            next.longitude!
          )
        }
      }

      // Detect most visited continent
      const continentCounts: Record<string, number> = {}
      albums.forEach(album => {
        const continent = detectContinent(album.country_code || '')
        continentCounts[continent] = (continentCounts[continent] || 0) + 1
      })
      const mostVisitedContinent = Object.entries(continentCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

      setStats({
        totalCountries,
        totalCities,
        totalPhotos: photosCount || 0,
        totalDistance: Math.round(totalDistance),
        mostVisitedContinent
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
    } finally {
      setLoading(false)
    }
  }

  function detectContinent(countryCode: string): string {
    // Simplified continent mapping
    const continentMap: Record<string, string> = {
      US: 'North America', CA: 'North America', MX: 'North America',
      GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Portugal', NL: 'Europe',
      JP: 'Asia', CN: 'Asia', IN: 'Asia', TH: 'Asia', KR: 'Asia', SG: 'Asia', VN: 'Asia',
      BR: 'South America', AR: 'South America', CL: 'South America', PE: 'South America',
      AU: 'Oceania', NZ: 'Oceania',
      EG: 'Africa', ZA: 'Africa', KE: 'Africa', MA: 'Africa', TN: 'Africa'
    }
    return continentMap[countryCode] || 'Other'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const hasHomeLocation = profile?.home_latitude && profile?.home_longitude
  const distanceLabel = hasHomeLocation ? 'From Home' : 'Est. Distance'

  const insights = [
    {
      icon: Globe,
      label: 'Countries',
      value: stats.totalCountries,
      color: 'text-teal-600',
      bg: 'bg-teal-50'
    },
    {
      icon: MapPin,
      label: 'Cities',
      value: stats.totalCities,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      icon: Camera,
      label: 'Photos',
      value: stats.totalPhotos,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      icon: Plane,
      label: distanceLabel,
      value: `${Math.floor(stats.totalDistance / 1000)}k km`,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Your Travel Insights</h3>
        <p className="text-xs text-gray-600 mt-0.5">See how you compare</p>
      </div>

      {/* Stats Grid - 2 columns */}
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 4, backgroundColor: 'rgba(243, 244, 246, 1)' }}
            className="flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-default"
          >
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={cn("p-2 rounded-lg", insight.bg)}
              >
                <insight.icon className={cn("h-4 w-4", insight.color)} />
              </motion.div>
              <span className="text-sm font-medium text-gray-700">{insight.label}</span>
            </div>
            <span className={cn("text-lg font-bold tabular-nums", insight.color)}>
              {typeof insight.value === 'number' ? (
                <AnimatedValue value={insight.value} />
              ) : (
                insight.value
              )}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Travel Profile Summary */}
      {stats.mostVisitedContinent !== 'N/A' && (
        <div className="mt-4 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-teal-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-900">Travel Profile</p>
              <p className="text-xs text-gray-700 mt-1">
                Most visited: <span className="font-medium">{stats.mostVisitedContinent}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
