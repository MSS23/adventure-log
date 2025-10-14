'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Compass,
  MapPin,
  TrendingUp,
  Users,
  Sparkles,
  ExternalLink,
  Heart,
  Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import Image from 'next/image'

interface Recommendation {
  id: string
  name: string
  country: string
  reason: string
  matchScore: number
  imageUrl?: string
  visitedBy: number
  tags: string[]
}

interface TravelRecommendationsProps {
  userId: string
  className?: string
}

export function TravelRecommendations({ userId, className }: TravelRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    generateRecommendations()
  }, [userId])

  const generateRecommendations = async () => {
    try {
      setLoading(true)

      // Fetch user's travel history
      const { data: userAlbums } = await supabase
        .from('albums')
        .select('location_name, country_code, latitude, longitude')
        .eq('user_id', userId)

      if (!userAlbums || userAlbums.length === 0) {
        setRecommendations(getDefaultRecommendations())
        return
      }

      // Analyze user preferences
      const visitedCountries = new Set(userAlbums.map(a => a.country_code).filter(Boolean))
      const visitedCities = new Set(userAlbums.map(a => a.location_name).filter(Boolean))

      // Fetch popular destinations from other users
      const { data: popularAlbums } = await supabase
        .from('albums')
        .select('location_name, country_code, latitude, longitude, user_id')
        .not('user_id', 'eq', userId)
        .not('location_name', 'is', null)
        .limit(100)

      if (!popularAlbums) {
        setRecommendations(getDefaultRecommendations())
        return
      }

      // Count popularity of destinations
      const destinationCounts = new Map<string, { count: number; country?: string }>()
      popularAlbums.forEach(album => {
        if (album.location_name && !visitedCities.has(album.location_name)) {
          const current = destinationCounts.get(album.location_name) || { count: 0, country: album.country_code }
          destinationCounts.set(album.location_name, {
            count: current.count + 1,
            country: album.country_code || current.country
          })
        }
      })

      // Generate recommendations
      const recs: Recommendation[] = []

      // Sort by popularity
      const sorted = Array.from(destinationCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)

      sorted.forEach(([location, data]) => {
        const reason = determineRecommendationReason(location, data.country, visitedCountries)
        const matchScore = calculateMatchScore(data.count, visitedCountries, data.country)

        recs.push({
          id: `rec-${location}`,
          name: location,
          country: data.country || 'Unknown',
          reason,
          matchScore,
          visitedBy: data.count,
          tags: generateTags(location, data.country)
        })
      })

      // If not enough recommendations, add defaults
      if (recs.length < 6) {
        const defaults = getDefaultRecommendations()
        const needed = 6 - recs.length
        recs.push(...defaults.slice(0, needed))
      }

      setRecommendations(recs)

      log.info('Recommendations generated', {
        component: 'TravelRecommendations',
        count: recs.length
      })
    } catch (error) {
      log.error('Failed to generate recommendations', {
        component: 'TravelRecommendations'
      }, error instanceof Error ? error : new Error(String(error)))
      setRecommendations(getDefaultRecommendations())
    } finally {
      setLoading(false)
    }
  }

  const determineRecommendationReason = (
    location: string,
    country: string | undefined,
    visitedCountries: Set<string>
  ): string => {
    if (country && visitedCountries.has(country)) {
      return `You've been to ${country} - explore more!`
    }

    if (location.toLowerCase().includes('beach') || location.toLowerCase().includes('island')) {
      return 'Perfect for beach lovers'
    }

    if (location.toLowerCase().includes('mountain') || location.toLowerCase().includes('alps')) {
      return 'Great for mountain enthusiasts'
    }

    return 'Popular with travelers like you'
  }

  const calculateMatchScore = (
    visitCount: number,
    visitedCountries: Set<string>,
    country: string | undefined
  ): number => {
    let score = Math.min(visitCount * 10, 100)

    // Bonus for same region
    if (country && visitedCountries.has(country)) {
      score = Math.min(score + 20, 100)
    }

    return score
  }

  const generateTags = (location: string, country: string | undefined): string[] => {
    const tags: string[] = []
    const locationLower = location.toLowerCase()

    if (locationLower.includes('beach') || locationLower.includes('island')) tags.push('Beach')
    if (locationLower.includes('mountain') || locationLower.includes('alps')) tags.push('Mountains')
    if (locationLower.includes('city') || ['paris', 'london', 'tokyo', 'new york'].some(c => locationLower.includes(c))) tags.push('City')
    if (country === 'US' || country === 'GB' || country === 'FR') tags.push('Popular')

    if (tags.length === 0) tags.push('Adventure')

    return tags.slice(0, 2)
  }

  const getDefaultRecommendations = (): Recommendation[] => {
    return [
      {
        id: 'rec-paris',
        name: 'Paris, France',
        country: 'France',
        reason: 'Classic European destination',
        matchScore: 85,
        visitedBy: 1250,
        tags: ['City', 'Culture']
      },
      {
        id: 'rec-tokyo',
        name: 'Tokyo, Japan',
        country: 'Japan',
        reason: 'Perfect blend of tradition and modernity',
        matchScore: 90,
        visitedBy: 1100,
        tags: ['City', 'Culture']
      },
      {
        id: 'rec-bali',
        name: 'Bali, Indonesia',
        country: 'Indonesia',
        reason: 'Tropical paradise',
        matchScore: 88,
        visitedBy: 980,
        tags: ['Beach', 'Island']
      },
      {
        id: 'rec-iceland',
        name: 'Reykjavik, Iceland',
        country: 'Iceland',
        reason: 'Stunning natural landscapes',
        matchScore: 82,
        visitedBy: 720,
        tags: ['Nature', 'Adventure']
      },
      {
        id: 'rec-santorini',
        name: 'Santorini, Greece',
        country: 'Greece',
        reason: 'Picturesque island getaway',
        matchScore: 87,
        visitedBy: 890,
        tags: ['Island', 'Beach']
      },
      {
        id: 'rec-nyc',
        name: 'New York City, USA',
        country: 'USA',
        reason: 'The city that never sleeps',
        matchScore: 86,
        visitedBy: 1400,
        tags: ['City', 'Popular']
      }
    ]
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Compass className="h-12 w-12 mx-auto mb-3 text-gray-400 animate-spin" />
            <p>Finding your next adventure...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-blue-600" />
          Recommended Destinations
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            For You
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {rec.name}
                  </h4>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {rec.country}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-yellow-600">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-bold">{rec.matchScore}</span>
                </div>
              </div>

              {/* Reason */}
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {rec.reason}
              </p>

              {/* Stats and Tags */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {rec.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>{rec.visitedBy}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 group-hover:bg-blue-50 group-hover:text-blue-700"
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(rec.name + ' travel guide')}`, '_blank')}
              >
                Explore Destination
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={generateRecommendations}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Refresh Recommendations
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
