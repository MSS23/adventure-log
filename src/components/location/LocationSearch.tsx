'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { Native } from '@/lib/utils/native'
import { Platform } from '@/lib/utils/platform'

interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  type: string
  importance: number
}

interface LocationData {
  latitude: number
  longitude: number
  display_name: string
  place_id?: string
}

interface LocationSearchProps {
  value?: LocationData | null
  onChange: (location: LocationData | null) => void
  placeholder?: string
  className?: string
  allowCurrentLocation?: boolean
}

export function LocationSearch({
  value,
  onChange,
  placeholder = "Search for a location...",
  className,
  allowCurrentLocation = true
}: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAttempts, setRetryAttempts] = useState(0)
  const maxRetries = 3
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update query when value changes externally
  useEffect(() => {
    if (value?.display_name) {
      setQuery(value.display_name)
    } else {
      setQuery('')
    }
  }, [value])

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Using Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          limit: '10',
          dedupe: '1',
          'accept-language': 'en'
        })
      )

      if (!response.ok) {
        throw new Error('Failed to search locations')
      }

      const data: LocationResult[] = await response.json()
      setResults(data)
      setShowResults(true)
    } catch (err) {
      log.error('Location search error', {}, err)
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch')
      if (isNetworkError && retryAttempts < maxRetries) {
        setRetryAttempts(prev => prev + 1)
        setTimeout(() => searchLocations(searchQuery), 1000 * (retryAttempts + 1))
        setError(`Connection failed, retrying... (${retryAttempts + 1}/${maxRetries})`)
      } else {
        setError('Failed to search locations. Please check your internet connection and try again.')
        setResults([])
      }
    } finally {
      setIsSearching(false)
    }
  }, [retryAttempts, maxRetries])

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (query.length >= 3) {
      searchTimeout.current = setTimeout(() => {
        searchLocations(query)
      }, 500)
    } else {
      setResults([])
      setShowResults(false)
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [query, searchLocations])

  const getCurrentLocation = async () => {
    if (!Platform.isCapabilityAvailable('geolocation')) {
      setError('Geolocation is not supported on this device')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    try {
      // Request permissions first on native platforms
      if (Platform.isNative()) {
        const permissions = await Native.requestPermissions(['geolocation'])
        if (!permissions.geolocation) {
          setError('Location permission is required to use current location')
          setIsGettingLocation(false)
          return
        }
      }

      // Get current location using Native utility
      const position = await Native.getCurrentLocation(10000)
      const { latitude, longitude } = position

      try {
        // Reverse geocode to get location name
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?` +
          new URLSearchParams({
            lat: latitude.toString(),
            lon: longitude.toString(),
            format: 'json',
            'accept-language': 'en'
          })
        )

        if (response.ok) {
          const data = await response.json()
          const locationData: LocationData = {
            latitude,
            longitude,
            display_name: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            place_id: data.place_id
          }
          onChange(locationData)
          setQuery(locationData.display_name)
          setShowResults(false)
        } else {
          // Fallback to coordinates only
          const locationData: LocationData = {
            latitude,
            longitude,
            display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }
          onChange(locationData)
          setQuery(locationData.display_name)
          setShowResults(false)
        }
      } catch (err) {
        log.error('Reverse geocoding error', {}, err)
        // Use coordinates as fallback
        const locationData: LocationData = {
          latitude,
          longitude,
          display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }
        onChange(locationData)
        setQuery(locationData.display_name)
        setShowResults(false)
      }

      setIsGettingLocation(false)
    } catch (error) {
      log.error('Geolocation error', {
        component: 'LocationSearch',
        action: 'getCurrentLocation',
        error: error instanceof Error ? error.message : String(error)
      })

      let errorMessage = 'Failed to get your current location'
      const errorStr = error instanceof Error ? error.message : String(error)

      if (errorStr.includes('permission') || errorStr.includes('denied')) {
        errorMessage = 'Location access denied. Please enable location permissions.'
      } else if (errorStr.includes('unavailable')) {
        errorMessage = 'Location information unavailable. Please try again.'
      } else if (errorStr.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.'
      }

      setError(errorMessage)
      setIsGettingLocation(false)
    }
  }

  const selectLocation = (result: LocationResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError('Invalid coordinates received from search')
      return
    }

    const locationData: LocationData = {
      latitude: lat,
      longitude: lon,
      display_name: result.display_name,
      place_id: result.place_id
    }

    onChange(locationData)
    setQuery(result.display_name)
    setShowResults(false)
    inputRef.current?.blur()
  }

  const clearLocation = () => {
    onChange(null)
    setQuery('')
    setShowResults(false)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    if (!newQuery.trim()) {
      onChange(null)
      setShowResults(false)
    }
  }

  const formatLocationName = (name: string) => {
    // Shorten long location names for better display
    const maxLength = 60
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...'
    }
    return name
  }

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-2">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="pl-12 pr-12 h-12 bg-white/80 dark:bg-gray-800/80 border-gray-300/50 dark:border-gray-600/50 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl backdrop-blur-sm transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              onFocus={() => {
                if (results.length > 0) {
                  setShowResults(true)
                }
              }}
            />
            {query && !isSearching && (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="absolute inset-0 rounded-lg border border-indigo-300/50 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>

          {allowCurrentLocation && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              title="Use current location"
              className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/30 dark:hover:to-green-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 transition-all duration-200 h-12 w-12 p-0 disabled:opacity-50"
            >
              {isGettingLocation ? (
                <div className="relative">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <div className="absolute inset-0 rounded-lg border border-emerald-300/50 animate-pulse"></div>
                </div>
              ) : (
                <Navigation className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200/50 dark:border-red-700/50 rounded-xl text-sm backdrop-blur-sm">
            <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="h-3 w-3 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              {error.includes('internet connection') && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setRetryAttempts(0)
                    if (query.length >= 3) {
                      searchLocations(query)
                    }
                  }}
                  className="mt-2 h-auto p-0 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 font-medium"
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        )}

        {value && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl backdrop-blur-sm">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Current Selection</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-auto bg-white/98 dark:bg-gray-800/98 border-gray-200/50 dark:border-gray-700/50 shadow-xl backdrop-blur-sm rounded-xl">
          <CardContent className="p-2">
            {results.map((result, index) => (
              <button
                key={result.place_id}
                type="button"
                className="w-full text-left p-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-xl transition-all duration-200 group"
                onClick={() => selectLocation(result)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-indigo-200 group-hover:to-purple-200 dark:group-hover:from-indigo-900/60 dark:group-hover:to-purple-900/60 transition-all duration-200">
                    <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                      {formatLocationName(result.display_name)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                      {isNaN(parseFloat(result.lat)) ? '0.0000' : parseFloat(result.lat).toFixed(4)}, {isNaN(parseFloat(result.lon)) ? '0.0000' : parseFloat(result.lon).toFixed(4)}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                    #{index + 1}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enhanced No Results Message */}
      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/98 dark:bg-gray-800/98 border-gray-200/50 dark:border-gray-700/50 shadow-xl backdrop-blur-sm rounded-xl">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">No locations found</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">No results for &quot;<span className="font-medium">{query}</span>&quot;</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try a different search term or check your spelling</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}