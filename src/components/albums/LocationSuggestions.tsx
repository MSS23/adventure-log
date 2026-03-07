'use client'

import { useEffect, useState } from 'react'
import { MapPin, TrendingUp, Clock } from 'lucide-react'
import { getLocationSuggestions, SmartLocationSuggestion } from '@/lib/services/smartLocations'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

interface LocationSuggestionsProps {
  onSelectLocation: (location: { name: string; latitude: number; longitude: number; countryCode: string }) => void
  className?: string
}

export function LocationSuggestions({ onSelectLocation, className }: LocationSuggestionsProps) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<SmartLocationSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSuggestions()
    }
  }, [user])

  const fetchSuggestions = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await getLocationSuggestions(user.id)
      setSuggestions(data)
    } catch (error) {
      log.error('Error fetching location suggestions', {
        component: 'LocationSuggestions',
        action: 'fetchSuggestions'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-teal-600" />
        <p className="text-sm font-semibold text-gray-700">Frequently Visited</p>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 5).map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelectLocation({
              name: suggestion.name,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
              countryCode: suggestion.countryCode
            })}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-lg transition-all duration-200 group border border-teal-100 hover:border-teal-300"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                <MapPin className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {suggestion.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {suggestion.frequency}x visited
                  </span>
                  <span>•</span>
                  <span>{suggestion.albumCount} {suggestion.albumCount === 1 ? 'album' : 'albums'}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                Select
              </div>
            </div>
          </button>
        ))}
      </div>

      {suggestions.length > 5 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          +{suggestions.length - 5} more locations in your history
        </p>
      )}
    </div>
  )
}
