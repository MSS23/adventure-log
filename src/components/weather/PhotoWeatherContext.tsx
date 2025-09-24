'use client'

import { useState, useEffect } from 'react'
import { weatherService, type WeatherData, type HistoricalWeather } from '@/lib/services/weatherService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Calendar,
  MapPin,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface PhotoWeatherContextProps {
  latitude?: number
  longitude?: number
  takenAt?: string
  location?: string
  showInline?: boolean
  compact?: boolean
  className?: string
}

interface WeatherContextData {
  weather: WeatherData
  sunrise?: string
  sunset?: string
  seasonInfo?: {
    season: string
    description: string
  }
}

export function PhotoWeatherContext({
  latitude,
  longitude,
  takenAt,
  location,
  showInline = false,
  compact = true,
  className
}: PhotoWeatherContextProps) {
  const [weatherData, setWeatherData] = useState<WeatherContextData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherContext = async () => {
    if (!latitude || !longitude || !takenAt) return

    setLoading(true)
    setError(null)

    try {
      const photoDate = new Date(takenAt)
      const locationData = { latitude, longitude, name: location }

      const historical = await weatherService.getHistoricalWeather(locationData, photoDate)

      if (historical) {
        const seasonInfo = getSeason(photoDate, latitude)

        setWeatherData({
          weather: historical.weather,
          sunrise: historical.sunrise,
          sunset: historical.sunset,
          seasonInfo
        })
      }
    } catch (err) {
      setError('Failed to fetch weather context')
      console.error('Weather context error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (latitude && longitude && takenAt) {
      fetchWeatherContext()
    }
  }, [latitude, longitude, takenAt])

  const getSeason = (date: Date, lat: number) => {
    const month = date.getMonth()
    const isNorthern = lat > 0

    let season: string
    let description: string

    if (isNorthern) {
      if (month >= 2 && month <= 4) {
        season = 'Spring'
        description = 'Mild temperatures and blooming nature'
      } else if (month >= 5 && month <= 7) {
        season = 'Summer'
        description = 'Warm weather perfect for outdoor activities'
      } else if (month >= 8 && month <= 10) {
        season = 'Autumn'
        description = 'Cool temperatures with beautiful fall colors'
      } else {
        season = 'Winter'
        description = 'Cold weather, cozy indoor moments'
      }
    } else {
      // Southern hemisphere seasons are reversed
      if (month >= 2 && month <= 4) {
        season = 'Autumn'
        description = 'Cool temperatures with changing seasons'
      } else if (month >= 5 && month <= 7) {
        season = 'Winter'
        description = 'Cooler weather, perfect for warm drinks'
      } else if (month >= 8 && month <= 10) {
        season = 'Spring'
        description = 'Mild temperatures and new beginnings'
      } else {
        season = 'Summer'
        description = 'Warm weather for beach and outdoor fun'
      }
    }

    return { season, description }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="h-4 w-4 text-yellow-500" />
      case 'clouds':
        return <Cloud className="h-4 w-4 text-gray-500" />
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-4 w-4 text-blue-500" />
      case 'snow':
        return <Snowflake className="h-4 w-4 text-blue-200" />
      default:
        return <Sun className="h-4 w-4 text-yellow-500" />
    }
  }

  const getSeasonEmoji = (season: string) => {
    switch (season.toLowerCase()) {
      case 'spring': return '🌸'
      case 'summer': return '☀️'
      case 'autumn':
      case 'fall': return '🍂'
      case 'winter': return '❄️'
      default: return '🌤️'
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTemperatureContext = (temp: number) => {
    if (temp >= 30) return { label: 'Hot', color: 'text-red-600' }
    if (temp >= 20) return { label: 'Warm', color: 'text-orange-600' }
    if (temp >= 10) return { label: 'Mild', color: 'text-green-600' }
    if (temp >= 0) return { label: 'Cool', color: 'text-blue-600' }
    return { label: 'Cold', color: 'text-blue-800' }
  }

  if (!latitude || !longitude || !takenAt) {
    return null
  }

  if (loading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        <div className="w-4 h-4 bg-gray-200 rounded mr-1"></div>
        Loading weather...
      </Badge>
    )
  }

  if (error || !weatherData) {
    return (
      <Badge variant="outline" className={cn("text-gray-500", className)}>
        <Cloud className="w-3 h-3 mr-1" />
        Weather unavailable
      </Badge>
    )
  }

  const { weather, sunrise, sunset, seasonInfo } = weatherData
  const tempContext = getTemperatureContext(weather.temperature)

  // Compact inline display
  if (compact && !showInline) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Badge variant="outline" className={cn("cursor-pointer hover:bg-gray-50", className)}>
            {getWeatherIcon(weather.condition.main)}
            <span className="ml-1">
              {weatherService.formatTemperature(weather.temperature)}
            </span>
            <span className="ml-1 text-xs opacity-75">
              {weatherService.getWeatherEmoji(weather.condition.main)}
            </span>
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weather Context
            </DialogTitle>
            <DialogDescription>
              Weather conditions when this photo was taken
            </DialogDescription>
          </DialogHeader>
          <WeatherContextDetails
            weather={weather}
            sunrise={sunrise}
            sunset={sunset}
            seasonInfo={seasonInfo}
            location={location}
            date={takenAt}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Inline display
  if (showInline) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <WeatherContextDetails
            weather={weather}
            sunrise={sunrise}
            sunset={sunset}
            seasonInfo={seasonInfo}
            location={location}
            date={takenAt}
          />
        </CardContent>
      </Card>
    )
  }

  // Extended badge display
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-1">
        {getWeatherIcon(weather.condition.main)}
        <span className={cn("font-medium", tempContext.color)}>
          {weatherService.formatTemperature(weather.temperature)}
        </span>
      </div>

      <Badge variant="secondary" className="text-xs">
        {tempContext.label}
      </Badge>

      {seasonInfo && (
        <Badge variant="outline" className="text-xs">
          {getSeasonEmoji(seasonInfo.season)} {seasonInfo.season}
        </Badge>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Info className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weather Context
            </DialogTitle>
            <DialogDescription>
              Weather conditions when this photo was taken
            </DialogDescription>
          </DialogHeader>
          <WeatherContextDetails
            weather={weather}
            sunrise={sunrise}
            sunset={sunset}
            seasonInfo={seasonInfo}
            location={location}
            date={takenAt}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

interface WeatherContextDetailsProps {
  weather: WeatherData
  sunrise?: string
  sunset?: string
  seasonInfo?: { season: string; description: string }
  location?: string
  date: string
}

function WeatherContextDetails({
  weather,
  sunrise,
  sunset,
  seasonInfo,
  location,
  date
}: WeatherContextDetailsProps) {
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="h-8 w-8 text-yellow-500" />
      case 'clouds':
        return <Cloud className="h-8 w-8 text-gray-500" />
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-8 w-8 text-blue-500" />
      case 'snow':
        return <Snowflake className="h-8 w-8 text-blue-200" />
      default:
        return <Sun className="h-8 w-8 text-yellow-500" />
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          {getWeatherIcon(weather.condition.main)}
          <div>
            <div className="text-2xl font-bold">
              {weatherService.formatTemperature(weather.temperature)}
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {weather.condition.description}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {location && <span>{location} • </span>}
          {formatDate(date)}
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-red-500" />
          <div>
            <div className="text-sm font-medium">Feels like</div>
            <div className="text-xs text-gray-600">
              {weatherService.formatTemperature(weather.feelsLike)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium">Humidity</div>
            <div className="text-xs text-gray-600">{weather.humidity}%</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-gray-600" />
          <div>
            <div className="text-sm font-medium">Wind</div>
            <div className="text-xs text-gray-600">{Math.round(weather.windSpeed)} m/s</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-500" />
          <div>
            <div className="text-sm font-medium">Visibility</div>
            <div className="text-xs text-gray-600">{Math.round(weather.visibility / 1000)} km</div>
          </div>
        </div>
      </div>

      {/* Season Info */}
      {seasonInfo && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{seasonInfo.season === 'Spring' ? '🌸' :
                                      seasonInfo.season === 'Summer' ? '☀️' :
                                      seasonInfo.season === 'Autumn' ? '🍂' : '❄️'}</span>
            <span className="font-medium text-blue-900">{seasonInfo.season}</span>
          </div>
          <p className="text-sm text-blue-800">{seasonInfo.description}</p>
        </div>
      )}

      {/* Sun Times */}
      {(sunrise || sunset) && (
        <div className="flex justify-between text-sm">
          {sunrise && (
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium">Sunrise</div>
                <div className="text-gray-600">{formatTime(sunrise)}</div>
              </div>
            </div>
          )}
          {sunset && (
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-red-500" />
              <div>
                <div className="font-medium">Sunset</div>
                <div className="text-gray-600">{formatTime(sunset)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context Message */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          {weatherService.getWeatherDescription(weather)}
        </p>
      </div>
    </div>
  )
}