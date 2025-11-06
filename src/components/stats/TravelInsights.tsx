'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { TrendingUp, Globe, Camera, MapPin, Plane, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TravelStats {
  totalCountries: number
  totalCities: number
  totalPhotos: number
  totalDistance: number
  mostVisitedContinent: string
  travelPace: number
  comparisonToAverage: number
  photographyScore: number
}

export function TravelInsights() {
  const { user } = useAuth()
  const [stats, setStats] = useState<TravelStats>({
    totalCountries: 0,
    totalCities: 0,
    totalPhotos: 0,
    totalDistance: 0,
    mostVisitedContinent: 'N/A',
    travelPace: 0,
    comparisonToAverage: 0,
    photographyScore: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      calculateStats()
    }
  }, [user])

  async function calculateStats() {
    if (!user) return

    const supabase = createClient()

    try {
      // Get albums with location data
      const { data: albums } = await supabase
        .from('albums')
        .select('id, country_code, location_name, created_at')
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

      // Calculate travel pace (countries per year)
      const firstTrip = new Date(albums[albums.length - 1]?.created_at || Date.now())
      const yearsActive = Math.max(1, (Date.now() - firstTrip.getTime()) / (1000 * 60 * 60 * 24 * 365))
      const travelPace = parseFloat((totalCountries / yearsActive).toFixed(1))

      // Mock continent detection (would need proper mapping in production)
      const continentCounts: Record<string, number> = {}
      albums.forEach(album => {
        const continent = detectContinent(album.country_code || '')
        continentCounts[continent] = (continentCounts[continent] || 0) + 1
      })
      const mostVisitedContinent = Object.entries(continentCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

      // Mock comparison (would compare with actual user average in production)
      const comparisonToAverage = totalCountries > 10 ? 2.5 : totalCountries > 5 ? 1.5 : 1.0

      // Photography score based on engagement (mock)
      const photographyScore = Math.min(100, Math.floor((photosCount || 0) / albums.length * 10) + 50)

      setStats({
        totalCountries,
        totalCities,
        totalPhotos: photosCount || 0,
        totalDistance: totalCountries * 1500, // Mock calculation
        mostVisitedContinent,
        travelPace,
        comparisonToAverage,
        photographyScore
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
      GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe',
      JP: 'Asia', CN: 'Asia', IN: 'Asia', TH: 'Asia', KR: 'Asia',
      BR: 'South America', AR: 'South America', CL: 'South America',
      AU: 'Oceania', NZ: 'Oceania',
      EG: 'Africa', ZA: 'Africa', KE: 'Africa'
    }
    return continentMap[countryCode] || 'Other'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const insights = [
    {
      icon: Globe,
      label: 'Countries Visited',
      value: stats.totalCountries,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      suffix: ''
    },
    {
      icon: MapPin,
      label: 'Cities Explored',
      value: stats.totalCities,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      suffix: ''
    },
    {
      icon: Camera,
      label: 'Photos Captured',
      value: stats.totalPhotos,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      suffix: ''
    },
    {
      icon: Plane,
      label: 'Est. Distance',
      value: Math.floor(stats.totalDistance / 1000),
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      suffix: 'k km'
    },
    {
      icon: TrendingUp,
      label: 'Travel Pace',
      value: stats.travelPace,
      color: 'text-green-600',
      bg: 'bg-green-50',
      suffix: ' /year'
    },
    {
      icon: Award,
      label: 'Photo Score',
      value: stats.photographyScore,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      suffix: '/100'
    }
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Travel Insights</h3>
          <p className="text-sm text-gray-600 mt-1">See how you compare</p>
        </div>
        {stats.comparisonToAverage > 1 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-cyan-50 px-3 py-1.5 rounded-full border border-teal-200">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">
              {stats.comparisonToAverage.toFixed(1)}x avg user
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200 group"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-lg", insight.bg)}>
                <insight.icon className={cn("h-4 w-4", insight.color)} />
              </div>
              <span className="text-xs text-gray-600 font-medium">{insight.label}</span>
            </div>
            <p className={cn("text-2xl font-bold", insight.color)}>
              {insight.value}{insight.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Insights Summary */}
      <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg">
            <Globe className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Travel Profile</p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Most visited: <span className="font-medium">{stats.mostVisitedContinent}</span></li>
              <li>• Exploring <span className="font-medium">{stats.travelPace}</span> new countries per year</li>
              <li>• Photography level: <span className="font-medium">
                {stats.photographyScore > 80 ? 'Expert' : stats.photographyScore > 60 ? 'Intermediate' : 'Beginner'}
              </span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
