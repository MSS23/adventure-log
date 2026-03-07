'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentWeather, formatTemperature, type CurrentWeather } from '@/lib/utils/weather'
import { Cloud, Droplet, Wind, Loader2, ThermometerSun } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface CurrentWeatherCardProps {
  latitude: number
  longitude: number
  locationName: string
  className?: string
}

export function CurrentWeatherCard({ latitude, longitude, locationName, className }: CurrentWeatherCardProps) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        setError(false)
        const data = await getCurrentWeather(latitude, longitude)
        setWeather(data)

        if (!data) {
          setError(true)
        }
      } catch (err) {
        log.error('Failed to fetch weather', {
          component: 'CurrentWeatherCard',
          latitude,
          longitude
        }, err instanceof Error ? err : new Error(String(err)))
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [latitude, longitude])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-600">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return null // Don't show anything if weather fails to load
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Weather</p>
              <p className="text-xs text-gray-500">{locationName}</p>
            </div>
            <div className="text-4xl">{weather.icon}</div>
          </div>

          {/* Temperature */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {formatTemperature(weather.temperature)}
            </span>
            <span className="text-sm text-gray-600">
              Feels like {formatTemperature(weather.feelsLike || weather.temperature)}
            </span>
          </div>

          {/* Description */}
          <div className="flex items-center gap-2 text-gray-700">
            <Cloud className="h-4 w-4" />
            <span className="text-sm font-medium">{weather.weatherDescription}</span>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            {weather.humidity !== undefined && (
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Humidity</p>
                  <p className="text-sm font-semibold text-gray-900">{Math.round(weather.humidity)}%</p>
                </div>
              </div>
            )}
            {weather.windSpeed !== undefined && (
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Wind</p>
                  <p className="text-sm font-semibold text-gray-900">{Math.round(weather.windSpeed)} km/h</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
