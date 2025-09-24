'use client'

import { useState, useEffect } from 'react'
import { weatherService, type ForecastWeather, type WeatherLocation } from '@/lib/services/weatherService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface WeatherForecastProps {
  location: WeatherLocation
  days?: number
  detailed?: boolean
  className?: string
  onDaySelect?: (forecast: ForecastWeather) => void
}

export function WeatherForecast({
  location,
  days = 5,
  detailed = false,
  className,
  onDaySelect
}: WeatherForecastProps) {
  const [forecast, setForecast] = useState<ForecastWeather[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const fetchForecast = async () => {
    setLoading(true)
    setError(null)

    try {
      const forecastData = await weatherService.getWeatherForecast(location, days)
      setForecast(forecastData)
    } catch (err) {
      setError('Failed to fetch weather forecast')
      console.error('Weather forecast error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchForecast()
    }
  }, [location, days])

  const handleDayClick = (dayForecast: ForecastWeather, index: number) => {
    setSelectedDay(index)
    onDaySelect?.(dayForecast)
  }

  const getWeatherIcon = (condition: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const iconClass = iconSizes[size]

    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className={cn(iconClass, 'text-yellow-500')} />
      case 'clouds':
        return <Cloud className={cn(iconClass, 'text-gray-500')} />
      case 'rain':
      case 'drizzle':
        return <CloudRain className={cn(iconClass, 'text-blue-500')} />
      case 'snow':
        return <Snowflake className={cn(iconClass, 'text-blue-200')} />
      default:
        return <Sun className={cn(iconClass, 'text-yellow-500')} />
    }
  }

  const getTravelRecommendation = (dayForecast: ForecastWeather) => {
    const { temperature, condition, precipitationProbability, windSpeed } = dayForecast

    if (precipitationProbability > 70) {
      return { level: 'warning', message: 'High chance of rain - pack an umbrella!' }
    }

    if (temperature > 30) {
      return { level: 'info', message: 'Hot weather - stay hydrated and wear sunscreen' }
    }

    if (temperature < 0) {
      return { level: 'warning', message: 'Freezing temperatures - dress warmly' }
    }

    if (windSpeed > 15) {
      return { level: 'caution', message: 'Windy conditions expected' }
    }

    if (condition.main.toLowerCase() === 'clear' && temperature >= 20 && temperature <= 28) {
      return { level: 'good', message: 'Perfect weather for sightseeing!' }
    }

    return { level: 'neutral', message: 'Check conditions before heading out' }
  }

  const getRecommendationColor = (level: string) => {
    switch (level) {
      case 'good':
        return 'text-green-700 bg-green-100 border-green-200'
      case 'warning':
        return 'text-red-700 bg-red-100 border-red-200'
      case 'caution':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'info':
        return 'text-blue-700 bg-blue-100 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const formatDate = (dateString: string, format: 'short' | 'long' = 'short') => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }

    return format === 'short'
      ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(Math.min(days, 5))].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Weather Forecast
            </span>
            <Button variant="ghost" size="sm" onClick={fetchForecast}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (forecast.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          No forecast data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {days}-Day Weather Forecast
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchForecast}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {location.name && (
          <p className="text-sm text-gray-600">{location.name}, {location.country}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Forecast Cards */}
        <div className="space-y-3">
          {forecast.map((dayForecast, index) => {
            const recommendation = getTravelRecommendation(dayForecast)
            const isSelected = selectedDay === index

            return (
              <motion.div
                key={dayForecast.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all duration-200",
                  isSelected
                    ? "border-blue-300 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                )}
                onClick={() => handleDayClick(dayForecast, index)}
              >
                <div className="flex items-center justify-between">
                  {/* Date and Weather Icon */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getWeatherIcon(dayForecast.condition.main)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDate(dayForecast.date)}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {dayForecast.condition.description}
                      </div>
                    </div>
                  </div>

                  {/* Temperature and Details */}
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {weatherService.formatTemperature(dayForecast.temperature)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      {dayForecast.precipitationProbability > 0 && (
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          <span>{Math.round(dayForecast.precipitationProbability)}%</span>
                        </div>
                      )}
                      {dayForecast.windSpeed > 0 && (
                        <div className="flex items-center gap-1">
                          <Wind className="h-3 w-3" />
                          <span>{Math.round(dayForecast.windSpeed)}m/s</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Travel Recommendation */}
                <div className={cn(
                  "mt-3 p-2 rounded text-xs border",
                  getRecommendationColor(recommendation.level)
                )}>
                  {recommendation.message}
                </div>

                {/* Detailed View */}
                {detailed && isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Feels like</div>
                        <div className="font-medium">
                          {weatherService.formatTemperature(dayForecast.feelsLike)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Humidity</div>
                        <div className="font-medium">{dayForecast.humidity}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Pressure</div>
                        <div className="font-medium">{dayForecast.pressure} hPa</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Clouds</div>
                        <div className="font-medium">{dayForecast.cloudCover}%</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Weather Trend Summary */}
        <Separator />
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Travel Summary
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Temperature range: {weatherService.formatTemperature(Math.min(...forecast.map(f => f.temperature)))} to {weatherService.formatTemperature(Math.max(...forecast.map(f => f.temperature)))}
            </p>
            <p>
              Best day for outdoor activities: {(() => {
                const bestDay = forecast.reduce((best, current) =>
                  (current.temperature > best.temperature &&
                   current.precipitationProbability < best.precipitationProbability &&
                   current.condition.main.toLowerCase() === 'clear')
                    ? current : best
                )
                return formatDate(bestDay.date)
              })()}
            </p>
            {forecast.some(f => f.precipitationProbability > 50) && (
              <p className="text-yellow-700">
                ⚠️ Rain expected on {forecast.filter(f => f.precipitationProbability > 50).length} day(s)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}