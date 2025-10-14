/**
 * Weather Data Integration
 *
 * Fetch historical weather data for trips using Open-Meteo API (free, no key required)
 */

import { log } from './logger'

export interface WeatherData {
  date: string
  temperature: {
    max: number
    min: number
    avg: number
  }
  precipitation: number
  weatherCode: number
  weatherDescription: string
  humidity?: number
  windSpeed?: number
  icon: string
}

export interface WeatherSummary {
  averageTemp: number
  totalPrecipitation: number
  sunnyDays: number
  rainyDays: number
  dominantWeather: string
  weatherIcon: string
}

/**
 * Weather code to description mapping (WMO Weather interpretation codes)
 */
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌧️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Slight snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '❄️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '🌨️' },
  80: { description: 'Slight rain showers', icon: '🌦️' },
  81: { description: 'Moderate rain showers', icon: '🌧️' },
  82: { description: 'Violent rain showers', icon: '⛈️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '❄️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' }
}

/**
 * Get weather description and icon from code
 */
function getWeatherInfo(code: number): { description: string; icon: string } {
  return WEATHER_CODES[code] || { description: 'Unknown', icon: '🌡️' }
}

/**
 * Fetch historical weather data for a specific location and date range
 * Uses Open-Meteo API (free, no API key required)
 */
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<WeatherData[]> {
  try {
    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()

    if (start > today || end > today) {
      log.warn('Cannot fetch weather for future dates', { startDate, endDate })
      return []
    }

    // Open-Meteo historical weather API
    const url = new URL('https://archive-api.open-meteo.com/v1/archive')
    url.searchParams.append('latitude', latitude.toString())
    url.searchParams.append('longitude', longitude.toString())
    url.searchParams.append('start_date', startDate)
    url.searchParams.append('end_date', endDate)
    url.searchParams.append('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode,relative_humidity_2m_mean,windspeed_10m_max')
    url.searchParams.append('timezone', 'auto')

    log.debug('Fetching historical weather', {
      component: 'weather',
      latitude,
      longitude,
      startDate,
      endDate
    })

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.daily) {
      log.warn('No weather data available for date range', { startDate, endDate })
      return []
    }

    // Transform API response to our format
    const weatherData: WeatherData[] = data.daily.time.map((date: string, index: number) => {
      const weatherCode = data.daily.weathercode[index] || 0
      const weatherInfo = getWeatherInfo(weatherCode)

      return {
        date,
        temperature: {
          max: Math.round(data.daily.temperature_2m_max[index]),
          min: Math.round(data.daily.temperature_2m_min[index]),
          avg: Math.round(data.daily.temperature_2m_mean[index])
        },
        precipitation: data.daily.precipitation_sum[index] || 0,
        weatherCode,
        weatherDescription: weatherInfo.description,
        humidity: data.daily.relative_humidity_2m_mean?.[index],
        windSpeed: data.daily.windspeed_10m_max?.[index],
        icon: weatherInfo.icon
      }
    })

    log.info('Weather data fetched successfully', {
      component: 'weather',
      daysCount: weatherData.length
    })

    return weatherData
  } catch (error) {
    log.error('Failed to fetch weather data', {
      component: 'weather',
      error: error instanceof Error ? error.message : String(error),
      latitude,
      longitude,
      startDate,
      endDate
    })
    return []
  }
}

/**
 * Generate weather summary for a trip
 */
export function generateWeatherSummary(weatherData: WeatherData[]): WeatherSummary | null {
  if (weatherData.length === 0) return null

  const totalTemp = weatherData.reduce((sum, day) => sum + day.temperature.avg, 0)
  const totalPrecipitation = weatherData.reduce((sum, day) => sum + day.precipitation, 0)
  const sunnyDays = weatherData.filter(day => day.weatherCode <= 1).length
  const rainyDays = weatherData.filter(day => day.precipitation > 0).length

  // Find most common weather condition
  const weatherCounts: Record<string, number> = {}
  weatherData.forEach(day => {
    weatherCounts[day.weatherDescription] = (weatherCounts[day.weatherDescription] || 0) + 1
  })

  const dominantWeather = Object.entries(weatherCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Variable'

  const dominantWeatherIcon = weatherData.find(d => d.weatherDescription === dominantWeather)?.icon || '🌡️'

  return {
    averageTemp: Math.round(totalTemp / weatherData.length),
    totalPrecipitation: Math.round(totalPrecipitation * 10) / 10,
    sunnyDays,
    rainyDays,
    dominantWeather,
    weatherIcon: dominantWeatherIcon
  }
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    const fahrenheit = (temp * 9/5) + 32
    return `${Math.round(fahrenheit)}°F`
  }
  return `${Math.round(temp)}°C`
}

/**
 * Format precipitation
 */
export function formatPrecipitation(mm: number): string {
  if (mm === 0) return 'No rain'
  if (mm < 1) return 'Trace'
  if (mm < 5) return 'Light'
  if (mm < 15) return 'Moderate'
  return 'Heavy'
}

/**
 * Get weather for album dates
 */
export async function getAlbumWeather(
  latitude: number,
  longitude: number,
  dateStart?: string,
  dateEnd?: string
): Promise<{
  dailyWeather: WeatherData[]
  summary: WeatherSummary | null
} | null> {
  if (!dateStart) return null

  // Use single day if no end date
  const endDate = dateEnd || dateStart

  const dailyWeather = await fetchHistoricalWeather(
    latitude,
    longitude,
    dateStart,
    endDate
  )

  const summary = generateWeatherSummary(dailyWeather)

  return {
    dailyWeather,
    summary
  }
}

/**
 * Cache weather data in localStorage to avoid repeated API calls
 */
const WEATHER_CACHE_KEY = 'weather_cache'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CachedWeather {
  key: string
  data: WeatherData[]
  timestamp: number
}

function getCacheKey(lat: number, lng: number, start: string, end: string): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${start}_${end}`
}

export async function getCachedWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherData[] | null> {
  if (typeof window === 'undefined') return null

  try {
    const cacheData = localStorage.getItem(WEATHER_CACHE_KEY)
    if (!cacheData) return null

    const cache: CachedWeather[] = JSON.parse(cacheData)
    const key = getCacheKey(latitude, longitude, startDate, endDate)
    const cached = cache.find(c => c.key === key)

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      log.debug('Using cached weather data', { key })
      return cached.data
    }

    return null
  } catch (error) {
    log.error('Error reading weather cache', { error })
    return null
  }
}

export function cacheWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  data: WeatherData[]
): void {
  if (typeof window === 'undefined') return

  try {
    const cacheData = localStorage.getItem(WEATHER_CACHE_KEY)
    let cache: CachedWeather[] = cacheData ? JSON.parse(cacheData) : []

    const key = getCacheKey(latitude, longitude, startDate, endDate)

    // Remove old entry if exists
    cache = cache.filter(c => c.key !== key)

    // Add new entry
    cache.push({
      key,
      data,
      timestamp: Date.now()
    })

    // Keep only last 50 entries
    if (cache.length > 50) {
      cache = cache.slice(-50)
    }

    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
    log.debug('Cached weather data', { key })
  } catch (error) {
    log.error('Error caching weather data', { error })
  }
}
