'use client'

import { useState, useEffect } from 'react'
import { weatherService, type ForecastWeather, type WeatherLocation } from '@/lib/services/weatherService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  MapPin,
  Calendar,
  Plus,
  X,
  Sun,
  Cloud,
  CloudRain,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Plane,
  Backpack,
  Umbrella,
  Thermometer,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface TravelPlan {
  id: string
  destination: string
  location: WeatherLocation | null
  startDate: string
  endDate: string
  activities: string[]
  preferences: {
    temperatureRange: [number, number]
    allowRain: boolean
    preferredConditions: string[]
  }
}

interface WeatherRecommendation {
  date: string
  forecast: ForecastWeather
  score: number
  activities: string[]
  warnings: string[]
  recommendations: string[]
}

interface TravelWeatherPlannerProps {
  className?: string
  onPlanSave?: (plan: TravelPlan) => void
}

const activityTypes = [
  { id: 'sightseeing', label: 'Sightseeing', icon: '🏛️', weather: ['clear', 'clouds'] },
  { id: 'outdoor', label: 'Outdoor Sports', icon: '🏃', weather: ['clear'] },
  { id: 'beach', label: 'Beach Activities', icon: '🏖️', weather: ['clear'], tempMin: 20 },
  { id: 'hiking', label: 'Hiking', icon: '🥾', weather: ['clear', 'clouds'], tempMax: 30 },
  { id: 'photography', label: 'Photography', icon: '📸', weather: ['clear', 'clouds'] },
  { id: 'cultural', label: 'Museums & Culture', icon: '🎭', weather: ['any'] },
  { id: 'food', label: 'Food Tours', icon: '🍽️', weather: ['any'] },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', weather: ['any'] },
  { id: 'nightlife', label: 'Nightlife', icon: '🌃', weather: ['any'] },
  { id: 'winter', label: 'Winter Sports', icon: '⛷️', weather: ['snow'], tempMax: 5 }
]

export function TravelWeatherPlanner({ className, onPlanSave }: TravelWeatherPlannerProps) {
  const [plan, setPlan] = useState<TravelPlan>({
    id: '',
    destination: '',
    location: null,
    startDate: '',
    endDate: '',
    activities: [],
    preferences: {
      temperatureRange: [15, 25],
      allowRain: false,
      preferredConditions: ['clear', 'clouds']
    }
  })

  const [recommendations, setRecommendations] = useState<WeatherRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchingLocation, setSearchingLocation] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<WeatherLocation[]>([])

  const searchDestination = async (query: string) => {
    if (query.length < 3) return

    setSearchingLocation(true)
    try {
      const location = await weatherService.getLocationCoordinates(query)
      if (location) {
        setLocationSuggestions([location])
        setPlan(prev => ({ ...prev, location }))
      }
    } catch (error) {
      console.error('Failed to search destination:', error)
    } finally {
      setSearchingLocation(false)
    }
  }

  const generateRecommendations = async () => {
    if (!plan.location || !plan.startDate || !plan.endDate) return

    setLoading(true)
    try {
      const startDate = new Date(plan.startDate)
      const endDate = new Date(plan.endDate)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 14) {
        alert('Please select a trip duration of 14 days or less')
        return
      }

      const forecast = await weatherService.getWeatherForecast(plan.location, daysDiff + 1)

      const recs = forecast
        .filter(f => {
          const forecastDate = new Date(f.date)
          return forecastDate >= startDate && forecastDate <= endDate
        })
        .map(f => generateDayRecommendation(f))
        .sort((a, b) => b.score - a.score)

      setRecommendations(recs)
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDayRecommendation = (forecast: ForecastWeather): WeatherRecommendation => {
    const { temperature, condition, precipitationProbability, windSpeed } = forecast
    const { temperatureRange, allowRain, preferredConditions } = plan.preferences

    let score = 100
    const warnings: string[] = []
    const recommendations: string[] = []
    const suitableActivities: string[] = []

    // Temperature scoring
    if (temperature >= temperatureRange[0] && temperature <= temperatureRange[1]) {
      score += 20
    } else if (temperature < temperatureRange[0]) {
      score -= Math.abs(temperature - temperatureRange[0]) * 2
      warnings.push(`Cooler than preferred (${weatherService.formatTemperature(temperature)})`)
    } else {
      score -= Math.abs(temperature - temperatureRange[1]) * 2
      warnings.push(`Warmer than preferred (${weatherService.formatTemperature(temperature)})`)
    }

    // Weather condition scoring
    if (preferredConditions.includes(condition.main.toLowerCase())) {
      score += 15
    } else {
      score -= 10
    }

    // Rain scoring
    if (precipitationProbability > 50) {
      if (!allowRain) {
        score -= 30
        warnings.push(`High chance of rain (${Math.round(precipitationProbability)}%)`)
        recommendations.push('Pack an umbrella and waterproof jacket')
      } else {
        score -= 10
      }
    }

    // Wind scoring
    if (windSpeed > 15) {
      score -= 10
      warnings.push('Windy conditions expected')
    }

    // Activity recommendations
    plan.activities.forEach(activityId => {
      const activity = activityTypes.find(a => a.id === activityId)
      if (!activity) return

      let activitySuitable = true

      if (activity.weather.includes('any')) {
        activitySuitable = true
      } else if (!activity.weather.includes(condition.main.toLowerCase())) {
        activitySuitable = false
      }

      if (activity.tempMin && temperature < activity.tempMin) {
        activitySuitable = false
      }

      if (activity.tempMax && temperature > activity.tempMax) {
        activitySuitable = false
      }

      if (activitySuitable) {
        suitableActivities.push(activity.label)
      }
    })

    // General recommendations
    if (temperature > 25) {
      recommendations.push('Wear light clothing and stay hydrated')
    } else if (temperature < 10) {
      recommendations.push('Dress warmly in layers')
    }

    if (condition.main.toLowerCase() === 'clear' && temperature >= 20) {
      recommendations.push('Perfect day for outdoor activities!')
    }

    return {
      date: forecast.date,
      forecast,
      score: Math.max(0, Math.min(100, score)),
      activities: suitableActivities,
      warnings,
      recommendations
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }

  const savePlan = () => {
    const newPlan = { ...plan, id: Date.now().toString() }
    onPlanSave?.(newPlan)
    // Reset form or show confirmation
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Travel Weather Planner
        </CardTitle>
        <p className="text-sm text-gray-600">
          Plan your trip with weather forecasts and activity recommendations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Destination Search */}
        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <div className="relative">
            <Input
              id="destination"
              placeholder="Search for a city or location..."
              value={plan.destination}
              onChange={(e) => {
                setPlan(prev => ({ ...prev, destination: e.target.value }))
                searchDestination(e.target.value)
              }}
            />
            {searchingLocation && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {plan.location && (
            <Badge variant="outline" className="mt-2">
              <MapPin className="h-3 w-3 mr-1" />
              {plan.location.name}, {plan.location.country}
            </Badge>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={plan.startDate}
              onChange={(e) => setPlan(prev => ({ ...prev, startDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={plan.endDate}
              onChange={(e) => setPlan(prev => ({ ...prev, endDate: e.target.value }))}
              min={plan.startDate || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Activities */}
        <div className="space-y-2">
          <Label>Planned Activities</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {activityTypes.map(activity => (
              <Button
                key={activity.id}
                variant={plan.activities.includes(activity.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPlan(prev => ({
                    ...prev,
                    activities: prev.activities.includes(activity.id)
                      ? prev.activities.filter(id => id !== activity.id)
                      : [...prev.activities, activity.id]
                  }))
                }}
                className="justify-start h-auto p-2"
              >
                <span className="mr-2">{activity.icon}</span>
                <span className="text-xs">{activity.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Weather Preferences */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium">Weather Preferences</h4>

          <div className="space-y-2">
            <Label>Preferred Temperature Range (°C)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={plan.preferences.temperatureRange[0]}
                onChange={(e) => setPlan(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    temperatureRange: [parseInt(e.target.value) || 0, prev.preferences.temperatureRange[1]]
                  }
                }))}
                className="w-20"
              />
              <span>to</span>
              <Input
                type="number"
                value={plan.preferences.temperatureRange[1]}
                onChange={(e) => setPlan(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    temperatureRange: [prev.preferences.temperatureRange[0], parseInt(e.target.value) || 30]
                  }
                }))}
                className="w-20"
              />
              <Thermometer className="h-4 w-4 text-gray-500" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowRain"
              checked={plan.preferences.allowRain}
              onChange={(e) => setPlan(prev => ({
                ...prev,
                preferences: { ...prev.preferences, allowRain: e.target.checked }
              }))}
            />
            <Label htmlFor="allowRain" className="flex items-center gap-2">
              <Umbrella className="h-4 w-4" />
              I don&apos;t mind rain
            </Label>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateRecommendations}
          disabled={!plan.location || !plan.startDate || !plan.endDate || loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing Weather...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Get Weather Recommendations
            </div>
          )}
        </Button>

        {/* Recommendations */}
        <AnimatePresence>
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Separator />

              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Daily Recommendations
                </h4>
                <Badge variant="secondary">
                  {recommendations.length} days analyzed
                </Badge>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium">{formatDate(rec.date)}</div>
                        <div className="text-sm text-gray-600 capitalize">
                          {rec.forecast.condition.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", getScoreColor(rec.score))}>
                          {getScoreLabel(rec.score)} ({Math.round(rec.score)}%)
                        </Badge>
                        <span className="text-lg font-semibold">
                          {weatherService.formatTemperature(rec.forecast.temperature)}
                        </span>
                      </div>
                    </div>

                    {rec.activities.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Great for:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.activities.map(activity => (
                            <Badge key={activity} variant="outline" className="text-xs text-green-700">
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.warnings.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-orange-700 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Considerations:
                        </div>
                        {rec.warnings.map((warning, idx) => (
                          <div key={idx} className="text-xs text-orange-700">• {warning}</div>
                        ))}
                      </div>
                    )}

                    {rec.recommendations.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <div className="font-medium mb-1">Tips:</div>
                        {rec.recommendations.map((tip, idx) => (
                          <div key={idx}>• {tip}</div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Save Plan Button */}
              <Button onClick={savePlan} variant="outline" className="w-full">
                <Backpack className="h-4 w-4 mr-2" />
                Save Travel Plan
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}