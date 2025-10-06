'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cloud, Droplets, Wind, Thermometer, Calendar } from 'lucide-react'
import {
  getAlbumWeather,
  formatTemperature,
  formatPrecipitation,
  getCachedWeather,
  cacheWeather,
  type WeatherData,
  type WeatherSummary
} from '@/lib/utils/weather'
import { log } from '@/lib/utils/logger'

interface WeatherDisplayProps {
  latitude: number
  longitude: number
  dateStart?: string
  dateEnd?: string
  compact?: boolean
  className?: string
}

export function WeatherDisplay({
  latitude,
  longitude,
  dateStart,
  dateEnd,
  compact = false,
  className
}: WeatherDisplayProps) {
  const [loading, setLoading] = useState(true)
  const [weatherData, setWeatherData] = useState<WeatherData[]>([])
  const [summary, setSummary] = useState<WeatherSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      if (!dateStart) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const endDate = dateEnd || dateStart

        // Try cache first
        const cached = await getCachedWeather(latitude, longitude, dateStart, endDate)
        if (cached) {
          setWeatherData(cached)
          const result = await getAlbumWeather(latitude, longitude, dateStart, endDate)
          if (result) {
            setSummary(result.summary)
          }
          setLoading(false)
          return
        }

        // Fetch from API
        const result = await getAlbumWeather(latitude, longitude, dateStart, endDate)

        if (result) {
          setWeatherData(result.dailyWeather)
          setSummary(result.summary)

          // Cache the data
          if (result.dailyWeather.length > 0) {
            cacheWeather(latitude, longitude, dateStart, endDate, result.dailyWeather)
          }
        }
      } catch (err) {
        log.error('Error fetching weather', { error: err })
        setError('Unable to load weather data')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [latitude, longitude, dateStart, dateEnd])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-gray-500">
            <Cloud className="h-5 w-5 animate-pulse" />
            <span className="text-sm">Loading weather data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return null // Silently fail if no weather data
  }

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">{summary.weatherIcon}</span>
          <div>
            <p className="font-medium text-gray-900">{summary.dominantWeather}</p>
            <p className="text-gray-600">Avg {formatTemperature(summary.averageTemp)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cloud className="h-5 w-5" />
          Weather During Trip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Thermometer className="h-5 w-5 text-blue-600 mb-1" />
            <span className="text-xs text-gray-600">Avg Temp</span>
            <span className="text-lg font-semibold text-blue-900">
              {formatTemperature(summary.averageTemp)}
            </span>
          </div>

          <div className="flex flex-col items-center p-3 bg-sky-50 rounded-lg">
            <Cloud className="h-5 w-5 text-sky-600 mb-1" />
            <span className="text-xs text-gray-600">Weather</span>
            <span className="text-lg font-semibold text-sky-900 text-center">
              {summary.dominantWeather}
            </span>
          </div>

          <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg">
            <Calendar className="h-5 w-5 text-yellow-600 mb-1" />
            <span className="text-xs text-gray-600">Sunny Days</span>
            <span className="text-lg font-semibold text-yellow-900">
              {summary.sunnyDays}
            </span>
          </div>

          <div className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg">
            <Droplets className="h-5 w-5 text-indigo-600 mb-1" />
            <span className="text-xs text-gray-600">Rainy Days</span>
            <span className="text-lg font-semibold text-indigo-900">
              {summary.rainyDays}
            </span>
          </div>
        </div>

        {/* Daily Weather */}
        {weatherData.length > 0 && weatherData.length <= 7 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Daily Conditions</h4>
            <div className="space-y-1">
              {weatherData.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{day.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-600">{day.weatherDescription}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTemperature(day.temperature.max)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTemperature(day.temperature.min)}
                      </p>
                    </div>

                    {day.precipitation > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Droplets className="h-3 w-3 mr-1" />
                        {day.precipitation.toFixed(1)}mm
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Long trip summary */}
        {weatherData.length > 7 && (
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {weatherData.length}-day trip with {formatTemperature(summary.averageTemp)} average temperature
              {summary.totalPrecipitation > 0 && ` and ${summary.totalPrecipitation}mm total rainfall`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Inline weather badge for compact display
 */
export function WeatherBadge({
  latitude,
  longitude,
  dateStart,
  dateEnd
}: WeatherDisplayProps) {
  const [summary, setSummary] = useState<WeatherSummary | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      if (!dateStart) return

      try {
        const result = await getAlbumWeather(
          latitude,
          longitude,
          dateStart,
          dateEnd || dateStart
        )
        if (result) {
          setSummary(result.summary)
        }
      } catch (error) {
        log.error('Error fetching weather badge', { error })
      }
    }

    fetchWeather()
  }, [latitude, longitude, dateStart, dateEnd])

  if (!summary) return null

  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <span>{summary.weatherIcon}</span>
      <span>{formatTemperature(summary.averageTemp)}</span>
    </Badge>
  )
}
