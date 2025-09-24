'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, X, Loader2, Navigation, Star, Globe, Plane } from 'lucide-react'
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
import {
  useKeyboardNavigation,
  announceToScreenReader
} from '@/lib/utils/accessibility'

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
  { id: 5, name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, airport_code: 'FCO', city_type: 'capital', region: 'Europe' },
  { id: 6, name: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734, airport_code: 'BCN', city_type: 'city', region: 'Europe' },
  { id: 7, name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, airport_code: 'AMS', city_type: 'capital', region: 'Europe' },
  { id: 8, name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, airport_code: 'SYD', city_type: 'city', region: 'Oceania' },
  { id: 9, name: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, airport_code: 'DXB', city_type: 'city', region: 'Middle East' },
  { id: 10, name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, airport_code: 'SIN', city_type: 'capital', region: 'Asia' },
  { id: 11, name: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, airport_code: 'BKK', city_type: 'capital', region: 'Asia' },
  { id: 12, name: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, airport_code: 'IST', city_type: 'city', region: 'Europe' },
  { id: 13, name: 'Los Angeles', country: 'United States', latitude: 34.0522, longitude: -118.2437, airport_code: 'LAX', city_type: 'city', region: 'North America' },
  { id: 14, name: 'Bali', country: 'Indonesia', latitude: -8.3405, longitude: 115.0920, airport_code: 'DPS', city_type: 'island', region: 'Asia' },
  { id: 15, name: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, airport_code: 'GRU', city_type: 'city', region: 'South America' },
  { id: 16, name: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, airport_code: 'BOM', city_type: 'city', region: 'Asia' },
  { id: 17, name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, airport_code: 'CAI', city_type: 'capital', region: 'Africa' },
  { id: 18, name: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, airport_code: 'CPT', city_type: 'city', region: 'Africa' }
]

const REGIONS = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East']

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
  const [, setActiveIndex] = useState(-1)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()


  // Combine results and popular cities for keyboard navigation
  const allOptions = showResults ? results.map(r => r.display_name) : dbCities.map(c => c.name)

  // Keyboard navigation
  const { currentIndex } = useKeyboardNavigation(
    allOptions,
    (item, index) => {
      if (showResults) {
        const result = results[index]
        if (result) {
          handleResultSelect(result)
        }
      } else {
        const city = dbCities[index]
        if (city) {
          handleCitySelect(city)
        }
      }
    },
    showResults || (showPopularDestinations && dbCities.length > 0)
  )

  // Update active index when keyboard navigation changes
  useEffect(() => {
    setActiveIndex(currentIndex)
  }, [currentIndex])

  // Handler functions for selection
  const handleResultSelect = useCallback((result: LocationResult) => {
    const locationData: LocationData = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      display_name: result.display_name,
      place_id: result.place_id
    }
    onChange(locationData)
    setQuery(result.display_name)
    setShowResults(false)
    setActiveIndex(-1)
    announceToScreenReader(`Selected location: ${result.display_name}`)
  }, [onChange])

  const handleCitySelect = useCallback((city: PopularDestination) => {
    const locationData: LocationData = {
      latitude: city.latitude,
      longitude: city.longitude,
      display_name: city.name,
      city_id: city.id
    }
    onChange(locationData)
    setQuery(city.name)
    setShowResults(false)
    setActiveIndex(-1)
    announceToScreenReader(`Selected location: ${city.name}`)
  }, [onChange])

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
      },
      (error) => {
        const standardError = ErrorHandler.handle(error, {
          component: 'LocationDropdown',
          action: 'get-current-location',
          errorCode: error.code
        })

        let userMessage = standardError.userMessage
        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            userMessage = 'Location information unavailable. Please try again.'
            break
          case error.TIMEOUT:
            userMessage = 'Location request timed out. Please try again.'
            break
        }

        setError(userMessage)
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
    const latitude = parseFloat(result.lat)
    const longitude = parseFloat(result.lon)

    // Validate coordinates
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-700" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className="pl-10 pr-10"
              aria-label="Location search"
              aria-expanded={showResults}
              aria-haspopup="listbox"
              role="combobox"
            />
            {query && (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                aria-label="Clear location"
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
              aria-label="Use current location"
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
                    if (query.length >= 2) {
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
              {formatCoordinatesDecimal(value.latitude, value.longitude)}
            </span>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden">
          <CardContent className="p-0">
            {/* Search Results */}
            {query.length >= 2 && results.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="p-3 bg-gray-50 border-b">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Results
                  </h4>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {results.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => selectLocation(result)}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 line-clamp-1">
                            {formatLocationName(result.display_name)}
                          </p>
                          <p className="text-sm text-gray-800">
                            {formatCoordinatesDecimal(parseFloat(result.lat), parseFloat(result.lon), 4)}
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
                <div className="p-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Popular Destinations
                    </h4>
                  </div>

                  {/* Region Filter */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Button
                      type="button"
                      variant={selectedRegion === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRegion(null)}
                      className="h-6 text-sm"
                    >
                      All
                    </Button>
                    {REGIONS.map(region => (
                      <Button
                        key={region}
                        type="button"
                        variant={selectedRegion === region ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedRegion(region)}
                        className="h-6 text-sm"
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-0">
                    {destinationsToShow.map((destination) => (
                      <button
                        key={destination.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        onClick={() => selectPopularDestination(destination)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getIconForCityType(destination.city_type)}
                            <div>
                              <p className="font-medium text-gray-900">{destination.name}</p>
                              <p className="text-sm text-gray-800">{destination.country}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {destination.airport_code && (
                              <Badge variant="outline" className="text-sm">
                                <Plane className="h-2 w-2 mr-1" />
                                {destination.airport_code}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-sm">
                              {destination.region}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No results message */}
            {query.length >= 2 && results.length === 0 && !isSearching && (
              <div className="p-6 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                <p className="text-gray-800">No locations found for &quot;{query}&quot;</p>
                <p className="text-sm text-gray-800 mt-1">Try a different search term or pick from popular destinations</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}