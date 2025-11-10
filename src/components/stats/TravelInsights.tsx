'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Globe, Camera, MapPin, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Your Travel Insights</h3>
        <p className="text-xs text-gray-600 mt-0.5">See how you compare</p>
      </div>

      {/* Stats Grid - 2 columns */}
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", insight.bg)}>
                <insight.icon className={cn("h-4 w-4", insight.color)} />
              </div>
              <span className="text-sm font-medium text-gray-700">{insight.label}</span>
            </div>
            <span className={cn("text-lg font-bold", insight.color)}>
              {insight.value}
            </span>
          </div>
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
