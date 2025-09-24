'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DonutChart, BarChart } from '@/components/ui/charts'
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

  // Mock data for demonstration - in real app, this would come from your analytics
  const seasonalData = [
    { label: 'Spring', value: 8, color: '#10B981' },
    { label: 'Summer', value: 15, color: '#F59E0B' },
    { label: 'Fall', value: 6, color: '#EF4444' },
    { label: 'Winter', value: 4, color: '#3B82F6' }
  ]

  const continentData = [
    { label: 'Europe', value: 12 },
    { label: 'Asia', value: 8 },
    { label: 'North America', value: 5 },
    { label: 'South America', value: 3 },
    { label: 'Africa', value: 2 },
    { label: 'Oceania', value: 3 }
  ]

  const insights: InsightCard[] = [
    {
      id: 'most-active-season',
      title: 'Favorite Travel Season',
      value: 'Summer',
      description: 'You travel most during summer months, with 45% of your adventures',
      icon: <Sun className="h-5 w-5" />,
      color: 'from-yellow-400 to-orange-500',
      trend: { value: 23, label: 'vs last year' }
    },
    {
      id: 'travel-frequency',
      title: 'Travel Frequency',
      value: '2.8',
      description: 'trips per year on average - you\'re a regular explorer!',
      icon: <Calendar className="h-5 w-5" />,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'photo-ratio',
      title: 'Photos per Album',
      value: Math.round((stats.totalPhotos || 0) / Math.max(stats.totalAlbums || 1, 1)).toString(),
      description: 'average photos per album - you capture every moment!',
      icon: <Camera className="h-5 w-5" />,
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'adventure-score',
      title: 'Adventure Score',
      value: Math.min(Math.round(((stats.countriesVisited || 0) * 10 + (stats.citiesExplored || 0) * 2) / 10), 100).toString(),
      description: 'Based on your exploration diversity and frequency',
      icon: <Star className="h-5 w-5" />,
      color: 'from-green-400 to-green-600',
      trend: { value: 15, label: 'this month' }
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
              size={160}
              strokeWidth={16}
              showLabels={true}
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
              animated={true}
              showLabels={true}
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
              {Math.round((stats.countriesVisited || 0) * 2847).toLocaleString()}
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
              {Math.round((stats.totalAlbums || 0) * 3.5)}
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
              {((stats.totalPhotos || 0) / Math.max(stats.totalAlbums || 1, 1)).toFixed(1)}
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
              {Math.min(Math.round(((stats.countriesVisited || 0) + (stats.citiesExplored || 0)) / 2), 100)}
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