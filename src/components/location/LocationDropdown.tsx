'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, X, Loader2, Navigation, Star, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import {
  validateLocationData,
  formatCoordinatesDecimal,
  sanitizeLocationInput,
  isValidTravelDestination,
  getRegionForCountryCode
} from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { ErrorHandler, handleApiError } from '@/lib/utils/errorHandler'
import { Native } from '@/lib/utils/native'
import { Platform } from '@/lib/utils/platform'

// Helper function to get country name from country code
function getCountryNameFromCode(code: string): string {
  const countryMap: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'ES': 'Spain',
    'JP': 'Japan',
    'AU': 'Australia',
    'CA': 'Canada',
    'BR': 'Brazil',
    'IN': 'India',
    'CN': 'China',
    'RU': 'Russia',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'TH': 'Thailand',
    'SG': 'Singapore',
    'AE': 'United Arab Emirates',
    'TR': 'Turkey',
    'GR': 'Greece',
    'NL': 'Netherlands',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'BE': 'Belgium',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'PT': 'Portugal',
    'IE': 'Ireland',
    'IS': 'Iceland',
    'KR': 'South Korea',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
    'NZ': 'New Zealand',
    'HK': 'Hong Kong',
    'MV': 'Maldives',
    'SC': 'Seychelles',
    'BB': 'Barbados',
    'BS': 'Bahamas',
    'JM': 'Jamaica',
    'AW': 'Aruba',
    'CW': 'Curaçao',
    'FJ': 'Fiji',
    'MA': 'Morocco',
    'PE': 'Peru',
    'CL': 'Chile',
    'CO': 'Colombia',
    'EC': 'Ecuador'
  }
  return countryMap[code] || code
}

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
  city_id?: number
  country_id?: number
  country_code?: string
}

interface PopularDestination {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  airport_code?: string
  city_type: 'capital' | 'city' | 'island'
  region: string
}

interface LocationDropdownProps {
  value?: LocationData | null
  onChange: (location: LocationData | null) => void
  placeholder?: string
  className?: string
  allowCurrentLocation?: boolean
  showPopularDestinations?: boolean
}

// Popular destinations for quick selection
const POPULAR_DESTINATIONS: PopularDestination[] = [
  { id: 1, name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, airport_code: 'CDG', city_type: 'capital', region: 'Europe' },
  { id: 2, name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, airport_code: 'NRT', city_type: 'capital', region: 'Asia' },
  { id: 3, name: 'New York City', country: 'United States', latitude: 40.7128, longitude: -74.0060, airport_code: 'JFK', city_type: 'city', region: 'North America' },
  { id: 4, name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, airport_code: 'LHR', city_type: 'capital', region: 'Europe' },
  { id: 5, name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, airport_code: 'SYD', city_type: 'city', region: 'Oceania' },
  { id: 6, name: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, airport_code: 'DXB', city_type: 'city', region: 'Middle East' },
  { id: 7, name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, airport_code: 'SIN', city_type: 'capital', region: 'Asia' },
  { id: 8, name: 'Los Angeles', country: 'United States', latitude: 34.0522, longitude: -118.2437, airport_code: 'LAX', city_type: 'city', region: 'North America' }
]

const REGIONS = ['Europe', 'Asia', 'North America', 'Oceania', 'Middle East']

export function LocationDropdown({
  value,
  onChange,
  placeholder = "Search destinations or pick a popular one...",
  className,
  allowCurrentLocation = true,
  showPopularDestinations = true
}: LocationDropdownProps) {
  // Generate unique IDs for accessibility

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setRetryAttempts] = useState(0)
  const [dbCities, setDbCities] = useState<PopularDestination[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()


  // Simplified keyboard navigation - let browser handle basic navigation

  // Update query when value changes externally
  useEffect(() => {
    if (value?.display_name) {
      setQuery(value.display_name)
    } else {
      setQuery('')
    }
  }, [value])

  // Load popular destinations from database
  useEffect(() => {
    const loadDbCities = async () => {
      try {
        const { data: cities } = await supabase
          .from('cities')
          .select(`
            id,
            name,
            latitude,
            longitude,
            airport_code,
            city_type,
            country_code,
            is_major_destination
          `)
          .eq('is_major_destination', true)
          .order('population', { ascending: false })
          .limit(50)

        if (cities) {
          const formattedCities = cities.map(city => ({
            id: city.id,
            name: city.name,
            country: getCountryNameFromCode(city.country_code) || '',
            latitude: city.latitude,
            longitude: city.longitude,
            airport_code: city.airport_code,
            city_type: city.city_type as 'capital' | 'city' | 'island',
            region: getRegionForCountryCode(city.country_code || '')
          }))
          setDbCities(formattedCities)
        }
      } catch (err) {
        log.error('Failed to load cities from database', {
          component: 'LocationDropdown',
          action: 'load-cities'
        }, err)
        // Fallback to hardcoded popular destinations
        setDbCities(POPULAR_DESTINATIONS)
      }
    }

    if (showPopularDestinations) {
      loadDbCities()
    }
  }, [showPopularDestinations, supabase])


  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (query.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        searchLocations(query)
      }, 300)
    } else {
      setResults([])
      if (query.length === 0) {
        setShowResults(showPopularDestinations)
      }
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [query, showPopularDestinations])

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Search using Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          limit: '8',
          dedupe: '1',
          'accept-language': 'en',
          addressdetails: '1'
        })
      )

      if (!response.ok) {
        throw new Error('Failed to search locations')
      }

      const data: LocationResult[] = await response.json()
      setResults(data)
      setShowResults(true)
    } catch (err) {
      const standardError = handleApiError(err, {
        component: 'LocationDropdown',
        action: 'search-location',
        query: searchQuery
      })
      setError(standardError.userMessage)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

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
        log.error('Reverse geocoding failed', {
          component: 'LocationDropdown',
          action: 'reverse-geocode',
          latitude,
          longitude
        }, err)
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
      const standardError = ErrorHandler.handle(error, {
        component: 'LocationDropdown',
        action: 'get-current-location'
      })

      let userMessage = standardError.userMessage
      const errorStr = error instanceof Error ? error.message : String(error)

      if (errorStr.includes('permission') || errorStr.includes('denied')) {
        userMessage = 'Location access denied. Please enable location permissions.'
      } else if (errorStr.includes('unavailable')) {
        userMessage = 'Location information unavailable. Please try again.'
      } else if (errorStr.includes('timeout')) {
        userMessage = 'Location request timed out. Please try again.'
      }

      setError(userMessage)
      setIsGettingLocation(false)
    }
  }

  const selectLocation = (result: LocationResult) => {
    const latitude = parseFloat(result.lat)
    const longitude = parseFloat(result.lon)

    // Validate coordinates for NaN and range first
    if (isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      setError('Received invalid coordinates from search result.')
      return
    }

    // Additional travel destination validation
    if (!isValidTravelDestination(latitude, longitude)) {
      setError('Selected location has invalid coordinates. Please choose a different location.')
      return
    }

    const locationData: LocationData = {
      latitude,
      longitude,
      display_name: sanitizeLocationInput(result.display_name),
      place_id: result.place_id
    }

    // Validate the complete location data
    const validation = validateLocationData(locationData)
    if (!validation.isValid) {
      setError(`Invalid location: ${validation.errors.join(', ')}`)
      return
    }

    onChange(locationData)
    setQuery(locationData.display_name)
    setShowResults(false)
    setError(null)
    inputRef.current?.blur()
  }

  const selectPopularDestination = (destination: PopularDestination) => {
    const locationData: LocationData = {
      latitude: destination.latitude,
      longitude: destination.longitude,
      display_name: `${destination.name}, ${destination.country}`,
      city_id: destination.id
    }

    // Validate the location data (popular destinations should always be valid)
    const validation = validateLocationData(locationData)
    if (!validation.isValid) {
      setError(`Invalid destination: ${validation.errors.join(', ')}`)
      return
    }

    onChange(locationData)
    setQuery(locationData.display_name)
    setShowResults(false)
    setError(null)
    inputRef.current?.blur()
  }

  const clearLocation = () => {
    onChange(null)
    setQuery('')
    setShowResults(showPopularDestinations)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = sanitizeLocationInput(e.target.value)
    setQuery(newQuery)

    if (!newQuery.trim()) {
      onChange(null)
      setShowResults(showPopularDestinations)
      setError(null)
    }
  }

  const handleInputFocus = () => {
    if (query.length === 0 && showPopularDestinations) {
      setShowResults(true)
    } else if (results.length > 0) {
      setShowResults(true)
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

  const getIconForCityType = (type: string) => {
    switch (type) {
      case 'capital': return <Star className="h-3 w-3 text-yellow-500" />
      case 'island': return <Globe className="h-3 w-3 text-blue-500" />
      default: return <MapPin className="h-3 w-3 text-gray-800" />
    }
  }

  const destinationsToShow = selectedRegion
    ? (dbCities.length > 0 ? dbCities : POPULAR_DESTINATIONS).filter(d => d.region === selectedRegion)
    : (dbCities.length > 0 ? dbCities : POPULAR_DESTINATIONS).slice(0, 12)

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className="pl-10 pr-10 h-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-lg"
              aria-label="Location search"
              aria-expanded={showResults}
              aria-haspopup="listbox"
              role="combobox"
            />
            {query && !isSearching && (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear location"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {allowCurrentLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              title="Use current location"
              aria-label="Use current location"
              className="h-10 w-10 p-0"
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
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            {error.includes('internet connection') && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setError(null)
                  setRetryAttempts(0)
                  if (query.length >= 2) {
                    searchLocations(query)
                  }
                }}
                className="mt-1 h-auto p-0 text-red-700 dark:text-red-300 hover:text-red-800"
              >
                Try again
              </Button>
            )}
          </div>
        )}

        {value && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <MapPin className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Selected Location</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                {formatCoordinatesDecimal(value.latitude, value.longitude)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Simplified Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {/* Search Results */}
            {query.length >= 2 && results.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Search Results</h4>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {results.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      onClick={() => selectLocation(result)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {formatLocationName(result.display_name)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {formatCoordinatesDecimal(
                              isNaN(parseFloat(result.lat)) ? 0 : parseFloat(result.lat),
                              isNaN(parseFloat(result.lon)) ? 0 : parseFloat(result.lon),
                              4
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Destinations */}
            {showPopularDestinations && (query.length === 0 || results.length === 0) && (
              <div>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Popular Destinations</h4>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Button
                      type="button"
                      variant={selectedRegion === null ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedRegion(null)}
                      className="h-7 text-xs"
                    >
                      All
                    </Button>
                    {REGIONS.map(region => (
                      <Button
                        key={region}
                        type="button"
                        variant={selectedRegion === region ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedRegion(region)}
                        className="h-7 text-xs"
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {destinationsToShow.map((destination) => (
                    <button
                      key={destination.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      onClick={() => selectPopularDestination(destination)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getIconForCityType(destination.city_type)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{destination.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{destination.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {destination.airport_code && (
                            <Badge variant="outline" className="text-xs">
                              {destination.airport_code}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {destination.region}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results message */}
            {query.length >= 2 && results.length === 0 && !isSearching && (
              <div className="p-4 text-center">
                <MapPin className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No locations found for &quot;{query}&quot;</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}