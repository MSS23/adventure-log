/**
 * Weather Service for Adventure Log
 * Provides historical, current, and forecast weather data
 */

interface WeatherCondition {
  id: number
  main: string
  description: string
  icon: string
}

interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  pressure: number
  windSpeed: number
  windDirection: number
  visibility: number
  cloudCover: number
  uvIndex?: number
  condition: WeatherCondition
  timestamp: string
}

interface HistoricalWeather {
  date: string
  weather: WeatherData
  sunrise: string
  sunset: string
}

interface ForecastWeather extends WeatherData {
  date: string
  precipitationProbability: number
  precipitationAmount: number
}

interface WeatherLocation {
  latitude: number
  longitude: number
  name?: string
  country?: string
  timezone?: string
}

class WeatherService {
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5'
  private readonly geoUrl = 'https://api.openweathermap.org/geo/1.0'
  private readonly oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall'

  // For demo purposes, we'll use a mock API key
  // In production, this should come from environment variables
  private readonly apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo_key'

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(location: WeatherLocation): Promise<WeatherData | null> {
    try {
      // Mock data for demo purposes (remove in production)
      if (this.apiKey === 'demo_key') {
        return this.getMockCurrentWeather()
      }

      const url = `${this.baseUrl}/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${this.apiKey}&units=metric`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseCurrentWeatherData(data)
    } catch (error) {
      console.error('Failed to fetch current weather:', error)
      return this.getMockCurrentWeather() // Fallback to mock data
    }
  }

  /**
   * Get weather forecast for a location (up to 7 days)
   */
  async getWeatherForecast(location: WeatherLocation, days: number = 5): Promise<ForecastWeather[]> {
    try {
      if (this.apiKey === 'demo_key') {
        return this.getMockWeatherForecast(location, days)
      }

      const url = `${this.baseUrl}/forecast?lat=${location.latitude}&lon=${location.longitude}&appid=${this.apiKey}&units=metric&cnt=${Math.min(days * 8, 40)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Weather forecast API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseWeatherForecastData(data, days)
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error)
      return this.getMockWeatherForecast(location, days)
    }
  }

  /**
   * Get historical weather data for a specific date
   * Note: This typically requires a paid OpenWeather plan
   */
  async getHistoricalWeather(location: WeatherLocation, date: Date): Promise<HistoricalWeather | null> {
    try {
      if (this.apiKey === 'demo_key') {
        return this.getMockHistoricalWeather(location, date)
      }

      const timestamp = Math.floor(date.getTime() / 1000)
      const url = `${this.oneCallUrl}/timemachine?lat=${location.latitude}&lon=${location.longitude}&dt=${timestamp}&appid=${this.apiKey}&units=metric`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Historical weather API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseHistoricalWeatherData(data, date)
    } catch (error) {
      console.error('Failed to fetch historical weather:', error)
      return this.getMockHistoricalWeather(location, date)
    }
  }

  /**
   * Get location coordinates from city name
   */
  async getLocationCoordinates(cityName: string): Promise<WeatherLocation | null> {
    try {
      if (this.apiKey === 'demo_key') {
        return this.getMockLocationCoordinates(cityName)
      }

      const url = `${this.geoUrl}/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${this.apiKey}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const data = await response.json()
      if (data.length === 0) return null

      const location = data[0]
      return {
        latitude: location.lat,
        longitude: location.lon,
        name: location.name,
        country: location.country
      }
    } catch (error) {
      console.error('Failed to get location coordinates:', error)
      return this.getMockLocationCoordinates(cityName)
    }
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
    return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`
  }

  /**
   * Get weather condition emoji
   */
  getWeatherEmoji(condition: string): string {
    const emojiMap: Record<string, string> = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️',
      'Dust': '💨',
      'Sand': '💨',
      'Smoke': '💨',
      'Squall': '🌬️',
      'Tornado': '🌪️'
    }
    return emojiMap[condition] || '🌤️'
  }

  /**
   * Format temperature with unit
   */
  formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
    return `${Math.round(temp)}°${unit}`
  }

  /**
   * Get weather description for travel planning
   */
  getWeatherDescription(weather: WeatherData): string {
    const { temperature, condition, windSpeed, humidity } = weather

    let description = condition.description

    if (temperature > 25) {
      description += ' (Great for outdoor activities)'
    } else if (temperature < 5) {
      description += ' (Pack warm clothes)'
    }

    if (windSpeed > 10) {
      description += ' - Windy conditions'
    }

    if (humidity > 80) {
      description += ' - High humidity'
    }

    return description.charAt(0).toUpperCase() + description.slice(1)
  }

  // Private methods for parsing API responses

  private parseCurrentWeatherData(data: Record<string, unknown>): WeatherData {
    // Type assertion for weather API data parsing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const main = (data as any).main
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wind = (data as any).wind
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clouds = (data as any).clouds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weather = (data as any).weather

    return {
      temperature: main.temp,
      feelsLike: main.feels_like,
      humidity: main.humidity,
      pressure: main.pressure,
      windSpeed: wind?.speed || 0,
      windDirection: wind?.deg || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visibility: (data as any).visibility || 10000,
      cloudCover: clouds.all,
      condition: weather[0],
      timestamp: new Date().toISOString()
    }
  }

  private parseWeatherForecastData(data: Record<string, unknown>, days: number): ForecastWeather[] {
    const forecasts: ForecastWeather[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyForecasts = new Map() as any

    // Group forecasts by date (take midday forecast for each day)
    (data.list as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const date = new Date((item as any).dt * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const hour = date.getHours()

      // Prefer midday forecasts (12-15h) or closest available
      if (!dailyForecasts.has(dateKey) || Math.abs(hour - 12) < Math.abs(dailyForecasts.get(dateKey).hour - 12)) {
        dailyForecasts.set(dateKey, { ...item, hour })
      }
    })

    // Convert to forecast array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.from(dailyForecasts.values()).slice(0, days).forEach((item: any) => {
      forecasts.push({
        date: new Date(item.dt * 1000).toISOString().split('T')[0],
        temperature: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind?.speed || 0,
        windDirection: item.wind?.deg || 0,
        visibility: item.visibility || 10000,
        cloudCover: item.clouds.all,
        condition: item.weather[0],
        timestamp: new Date(item.dt * 1000).toISOString(),
        precipitationProbability: (item.pop || 0) * 100,
        precipitationAmount: item.rain?.['3h'] || item.snow?.['3h'] || 0
      })
    })

    return forecasts
  }

  private parseHistoricalWeatherData(data: Record<string, unknown>, date: Date): HistoricalWeather {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weather = (data as any).data[0]
    return {
      date: date.toISOString().split('T')[0],
      weather: {
        temperature: weather.temp,
        feelsLike: weather.feels_like,
        humidity: weather.humidity,
        pressure: weather.pressure,
        windSpeed: weather.wind_speed,
        windDirection: weather.wind_deg,
        visibility: weather.visibility,
        cloudCover: weather.clouds,
        uvIndex: weather.uvi,
        condition: weather.weather[0],
        timestamp: new Date(weather.dt * 1000).toISOString()
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sunrise: new Date((data as any).data[0].sunrise * 1000).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sunset: new Date((data as any).data[0].sunset * 1000).toISOString()
    }
  }

  // Mock data methods for demo purposes

  private getMockCurrentWeather(): WeatherData {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow']
    const condition = conditions[Math.floor(Math.random() * conditions.length)]

    return {
      temperature: Math.round(15 + Math.random() * 15), // 15-30°C
      feelsLike: Math.round(15 + Math.random() * 15),
      humidity: Math.round(40 + Math.random() * 40), // 40-80%
      pressure: Math.round(1000 + Math.random() * 50), // 1000-1050 hPa
      windSpeed: Math.round(Math.random() * 20), // 0-20 m/s
      windDirection: Math.round(Math.random() * 360),
      visibility: 10000,
      cloudCover: Math.round(Math.random() * 100),
      uvIndex: Math.round(Math.random() * 10),
      condition: {
        id: 800,
        main: condition,
        description: condition.toLowerCase(),
        icon: '01d'
      },
      timestamp: new Date().toISOString()
    }
  }

  private getMockWeatherForecast(location: WeatherLocation, days: number): ForecastWeather[] {
    const forecasts: ForecastWeather[] = []
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow']

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      const condition = conditions[Math.floor(Math.random() * conditions.length)]

      forecasts.push({
        date: date.toISOString().split('T')[0],
        temperature: Math.round(15 + Math.random() * 15),
        feelsLike: Math.round(15 + Math.random() * 15),
        humidity: Math.round(40 + Math.random() * 40),
        pressure: Math.round(1000 + Math.random() * 50),
        windSpeed: Math.round(Math.random() * 20),
        windDirection: Math.round(Math.random() * 360),
        visibility: 10000,
        cloudCover: Math.round(Math.random() * 100),
        condition: {
          id: 800,
          main: condition,
          description: condition.toLowerCase(),
          icon: '01d'
        },
        timestamp: date.toISOString(),
        precipitationProbability: Math.round(Math.random() * 100),
        precipitationAmount: Math.round(Math.random() * 10)
      })
    }

    return forecasts
  }

  private getMockHistoricalWeather(location: WeatherLocation, date: Date): HistoricalWeather {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow']
    const condition = conditions[Math.floor(Math.random() * conditions.length)]

    return {
      date: date.toISOString().split('T')[0],
      weather: {
        temperature: Math.round(15 + Math.random() * 15),
        feelsLike: Math.round(15 + Math.random() * 15),
        humidity: Math.round(40 + Math.random() * 40),
        pressure: Math.round(1000 + Math.random() * 50),
        windSpeed: Math.round(Math.random() * 20),
        windDirection: Math.round(Math.random() * 360),
        visibility: 10000,
        cloudCover: Math.round(Math.random() * 100),
        uvIndex: Math.round(Math.random() * 10),
        condition: {
          id: 800,
          main: condition,
          description: condition.toLowerCase(),
          icon: '01d'
        },
        timestamp: date.toISOString()
      },
      sunrise: new Date(date.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 AM
      sunset: new Date(date.getTime() + 18 * 60 * 60 * 1000).toISOString() // 6 PM
    }
  }

  private getMockLocationCoordinates(cityName: string): WeatherLocation {
    // Mock coordinates for common cities
    const mockLocations: Record<string, WeatherLocation> = {
      'paris': { latitude: 48.8566, longitude: 2.3522, name: 'Paris', country: 'FR' },
      'london': { latitude: 51.5074, longitude: -0.1278, name: 'London', country: 'GB' },
      'tokyo': { latitude: 35.6762, longitude: 139.6503, name: 'Tokyo', country: 'JP' },
      'new york': { latitude: 40.7128, longitude: -74.0060, name: 'New York', country: 'US' },
      'sydney': { latitude: -33.8688, longitude: 151.2093, name: 'Sydney', country: 'AU' }
    }

    const key = cityName.toLowerCase()
    return mockLocations[key] || {
      latitude: 40.7128 + (Math.random() - 0.5) * 20,
      longitude: -74.0060 + (Math.random() - 0.5) * 40,
      name: cityName,
      country: 'Unknown'
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService()

// Export types
export type {
  WeatherData,
  HistoricalWeather,
  ForecastWeather,
  WeatherLocation,
  WeatherCondition
}