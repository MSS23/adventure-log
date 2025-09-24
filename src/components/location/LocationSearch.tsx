'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

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
      },
      (error) => {
        log.error('Geolocation error', { errorCode: error.code, errorMessage: error.message })
        let errorMessage = 'Failed to get your current location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
          default:
            errorMessage = 'Failed to get your current location. Please try again.'
        }

        setError(errorMessage)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const selectLocation = (result: LocationResult) => {
    const locationData: LocationData = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-700" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="pl-10 pr-10"
              onFocus={() => {
                if (results.length > 0) {
                  setShowResults(true)
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-3 w-3 text-gray-700" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
              </div>
            )}
          </div>

          {allowCurrentLocation && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              title="Use current location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            <div className="flex-1">
              <p>{error}</p>
              {error.includes('internet connection') && (
                <button
                  onClick={() => {
                    setError(null)
                    setRetryAttempts(0)
                    if (query.length >= 3) {
                      searchLocations(query)
                    }
                  }}
                  className="mt-1 text-red-700 underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {value && (
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <MapPin className="h-3 w-3" />
            <span>
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto">
          <CardContent className="p-2">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => selectLocation(result)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {formatLocationName(result.display_name)}
                    </p>
                    <p className="text-sm text-gray-800">
                      {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1">
          <CardContent className="p-4 text-center">
            <p className="text-gray-800">No locations found for &quot;{query}&quot;</p>
            <p className="text-sm text-gray-800 mt-1">Try a different search term</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}