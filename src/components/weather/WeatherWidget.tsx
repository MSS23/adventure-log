'use client'

import { useState, useEffect } from 'react'
import { weatherService, type WeatherData, type WeatherLocation } from '@/lib/services/weatherService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Droplets,
  Eye,
  Gauge,
  RefreshCw,
  MapPin,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface WeatherWidgetProps {
  location: WeatherLocation
  showDetails?: boolean
  compact?: boolean
  className?: string
  date?: Date // For historical weather
  onRefresh?: () => void
}

export function WeatherWidget({
  location,
  showDetails = false,
  compact = false,
  className,
  date,
  onRefresh
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchWeather = async () => {
    setLoading(true)
    setError(null)

    try {
      let weatherData: WeatherData | null = null

      if (date) {
        // Fetch historical weather
        const historical = await weatherService.getHistoricalWeather(location, date)
        weatherData = historical?.weather || null
      } else {
        // Fetch current weather
        weatherData = await weatherService.getCurrentWeather(location)
      }

      setWeather(weatherData)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to fetch weather data')
      console.error('Weather fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchWeather()
    }
  }, [location, date])

  const handleRefresh = () => {
    fetchWeather()
    onRefresh?.()
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="h-5 w-5 text-yellow-500" />
      case 'clouds':
        return <Cloud className="h-5 w-5 text-gray-500" />
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-5 w-5 text-blue-500" />
      case 'snow':
        return <Snowflake className="h-5 w-5 text-blue-200" />
      default:
        return <Sun className="h-5 w-5 text-yellow-500" />
    }
  }

  const getTemperatureColor = (temp: number) => {
    if (temp >= 30) return 'text-red-500'
    if (temp >= 20) return 'text-orange-500'
    if (temp >= 10) return 'text-green-500'
    if (temp >= 0) return 'text-blue-500'
    return 'text-blue-700'
  }

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-center justify-between">
            <span className="text-red-600 text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weather) {
    return (
      <Card className={cn("border-gray-200", className)}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="text-center text-gray-500 text-sm">
            No weather data available
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border", className)}
      >
        {getWeatherIcon(weather.condition.main)}
        <div className="text-sm">
          <span className={cn("font-semibold", getTemperatureColor(weather.temperature))}>
            {weatherService.formatTemperature(weather.temperature)}
          </span>
          <span className="text-gray-600 ml-1 hidden sm:inline">
            {weather.condition.description}
          </span>
        </div>
        {weatherService.getWeatherEmoji(weather.condition.main) && (
          <span className="text-lg">{weatherService.getWeatherEmoji(weather.condition.main)}</span>
        )}
      </motion.div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            {location.name || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
            {date && (
              <Badge variant="outline" className="ml-2">
                <Calendar className="h-3 w-3 mr-1" />
                Historical
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {lastUpdated && !date && (
          <p className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Weather Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
              {getWeatherIcon(weather.condition.main)}
            </div>
            <div>
              <div className={cn("text-2xl font-bold", getTemperatureColor(weather.temperature))}>
                {weatherService.formatTemperature(weather.temperature)}
              </div>
              <div className="text-sm text-gray-600 capitalize">
                {weather.condition.description}
              </div>
              <div className="text-xs text-gray-500">
                Feels like {weatherService.formatTemperature(weather.feelsLike)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-1">
              {weatherService.getWeatherEmoji(weather.condition.main)}
            </div>
            <Badge variant="secondary" className="text-xs">
              {weather.condition.main}
            </Badge>
          </div>
        </div>

        {/* Weather Details */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-2 gap-4 pt-4 border-t"
          >
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{weather.humidity}%</div>
                <div className="text-xs text-gray-500">Humidity</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-600" />
              <div>
                <div className="text-sm font-medium">{Math.round(weather.windSpeed)} m/s</div>
                <div className="text-xs text-gray-500">Wind Speed</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">{weather.pressure} hPa</div>
                <div className="text-xs text-gray-500">Pressure</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">{Math.round(weather.visibility / 1000)} km</div>
                <div className="text-xs text-gray-500">Visibility</div>
              </div>
            </div>

            {weather.uvIndex !== undefined && (
              <div className="flex items-center gap-2 col-span-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">UV Index: {weather.uvIndex}</div>
                  <div className="text-xs text-gray-500">
                    {weather.uvIndex <= 2 ? 'Low' :
                     weather.uvIndex <= 5 ? 'Moderate' :
                     weather.uvIndex <= 7 ? 'High' :
                     weather.uvIndex <= 10 ? 'Very High' : 'Extreme'}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Weather Description for Travel */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            {weatherService.getWeatherDescription(weather)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}