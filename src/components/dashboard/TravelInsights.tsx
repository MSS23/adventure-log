'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTravelInsights } from '@/lib/hooks/useTravelInsights'
import {
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  Sun,
  Snowflake,
  Leaf,
  Flower,
  Plane,
  Camera,
  Heart,
  Star
} from 'lucide-react'

// Placeholder chart components
const DonutChart = ({
  data
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) => (
  <div className="flex flex-wrap gap-2">
    {data.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-sm text-gray-600">{item.label}: {item.value}</span>
      </div>
    ))}
  </div>
)

const BarChart = ({
  data
}: {
  data: Array<{ label: string; value: number; color?: string }>;
}) => (
  <div className="space-y-2">
    {data.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-20">{item.label}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-900">{item.value}</span>
      </div>
    ))}
  </div>
)

interface TravelInsightsProps {
  stats: {
    totalAlbums: number
    totalPhotos: number
    countriesVisited: number
    citiesExplored: number
  }
  className?: string
}

interface InsightCard {
  id: string
  title: string
  value: string
  description: string
  icon: React.ReactNode
  color: string
  trend?: {
    value: number
    label: string
  }
}

export function TravelInsights({ stats, className }: TravelInsightsProps) {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const { data: insightsData, loading: insightsLoading } = useTravelInsights()

  // Use real data from the hook
  const seasonalData = insightsData.seasonalTravel
  const continentData = insightsData.continentTravel

  // Find the most active season
  const mostActiveSeason = seasonalData.length > 0
    ? seasonalData.reduce((max, season) => season.value > max.value ? season : max, seasonalData[0])
    : { label: 'Summer', value: 0 }

  const insights: InsightCard[] = [
    {
      id: 'travel-frequency',
      title: 'Travel Frequency',
      value: insightsData.travelFrequency.toFixed(1),
      description: 'trips per year on average - you\'re a regular explorer!',
      icon: <Calendar className="h-5 w-5" />,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'most-active-season',
      title: 'Favorite Travel Season',
      value: mostActiveSeason.label,
      description: `You travel most during ${mostActiveSeason.label.toLowerCase()} months`,
      icon: mostActiveSeason.label === 'Summer' ? <Sun className="h-5 w-5" /> :
            mostActiveSeason.label === 'Spring' ? <Flower className="h-5 w-5" /> :
            mostActiveSeason.label === 'Fall' ? <Leaf className="h-5 w-5" /> :
            <Snowflake className="h-5 w-5" />,
      color: mostActiveSeason.label === 'Summer' ? 'from-yellow-400 to-orange-500' :
             mostActiveSeason.label === 'Spring' ? 'from-green-400 to-green-600' :
             mostActiveSeason.label === 'Fall' ? 'from-orange-400 to-red-500' :
             'from-blue-400 to-blue-600'
    },
    {
      id: 'photo-ratio',
      title: 'Photos per Album',
      value: insightsData.photosPerAlbum.toFixed(1),
      description: 'average photos per album - you capture every moment!',
      icon: <Camera className="h-5 w-5" />,
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'adventure-score',
      title: 'Explorer Level',
      value: insightsData.explorerLevel.toString(),
      description: 'Based on your exploration diversity and frequency',
      icon: <Star className="h-5 w-5" />,
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'wanderlust-level',
      title: 'Wanderlust Level',
      value: (stats.countriesVisited || 0) > 10 ? 'High' : (stats.countriesVisited || 0) > 5 ? 'Medium' : 'Growing',
      description: `You've explored ${stats.countriesVisited || 0} countries - ${(stats.countriesVisited || 0) > 10 ? 'world traveler!' : 'keep exploring!'}`,
      icon: <Heart className="h-5 w-5" />,
      color: 'from-pink-400 to-red-500'
    }
  ]

  // Rotate through insights every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % insights.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [insights.length])

  const currentInsight = insights[currentInsightIndex]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Featured Insight Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Travel Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            key={currentInsight.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <div className={`p-4 rounded-xl bg-gradient-to-br ${currentInsight.color} text-white shadow-lg`}>
              {currentInsight.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{currentInsight.title}</h3>
                {currentInsight.trend && (
                  <Badge variant="secondary" className="text-sm">
                    +{currentInsight.trend.value}% {currentInsight.trend.label}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{currentInsight.value}</p>
              <p className="text-sm text-gray-800">{currentInsight.description}</p>
            </div>
          </motion.div>

          {/* Insight Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentInsightIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentInsightIndex
                    ? 'bg-blue-600 w-6'
                    : 'bg-blue-300 hover:bg-blue-400'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Travel Pattern */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex gap-1">
                <Flower className="h-4 w-4 text-green-500" />
                <Sun className="h-4 w-4 text-yellow-500" />
                <Leaf className="h-4 w-4 text-orange-500" />
                <Snowflake className="h-4 w-4 text-blue-500" />
              </div>
              Seasonal Travel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={seasonalData}
            />
          </CardContent>
        </Card>

        {/* Travel Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Travel by Continent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={continentData.map(d => ({ ...d, color: '#3B82F6' }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Facts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="p-2 bg-blue-100 rounded-lg w-fit mx-auto mb-2">
              <Plane className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {insightsData.milesTraveled.toLocaleString()}
            </div>
            <div className="text-sm text-gray-800">Miles Traveled*</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="p-2 bg-green-100 rounded-lg w-fit mx-auto mb-2">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {insightsData.daysTraveling}
            </div>
            <div className="text-sm text-gray-800">Days Traveling*</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="p-2 bg-purple-100 rounded-lg w-fit mx-auto mb-2">
              <Camera className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {insightsData.photosPerAlbum.toFixed(1)}
            </div>
            <div className="text-sm text-gray-800">Photos/Album</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="p-2 bg-yellow-100 rounded-lg w-fit mx-auto mb-2">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {insightsData.explorerLevel}
            </div>
            <div className="text-sm text-gray-800">Explorer Level</div>
          </div>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-800">
        * Estimates based on average travel patterns
      </div>
    </div>
  )
}