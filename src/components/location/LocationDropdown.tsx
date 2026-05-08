'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  validateLocationData,
  sanitizeLocationInput,
  isValidTravelDestination,
} from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { handleNetworkError } from '@/lib/utils/error-handler'

interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  type: string
  importance: number
  address?: {
    country_code?: string
    [key: string]: string | undefined
  }
}

interface LocationData {
  latitude: number
  longitude: number
  display_name: string
  city?: string
  place_id?: string
  city_id?: number
  country_id?: number
  country_code?: string
  countryCode?: string
}

interface PopularDestination {
  name: string
  country: string
  latitude: number
  longitude: number
  emoji: string
  country_code: string
}

interface LocationDropdownProps {
  value?: LocationData | null
  onChange: (location: LocationData | null) => void
  placeholder?: string
  className?: string
  allowCurrentLocation?: boolean
  showPopularDestinations?: boolean
}

const POPULAR_DESTINATIONS: PopularDestination[] = [
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, emoji: '🇫🇷', country_code: 'FR' },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, emoji: '🇯🇵', country_code: 'JP' },
  { name: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, emoji: '🇺🇸', country_code: 'US' },
  { name: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, emoji: '🇬🇧', country_code: 'GB' },
  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, emoji: '🇮🇹', country_code: 'IT' },
  { name: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734, emoji: '🇪🇸', country_code: 'ES' },
  { name: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, emoji: '🇦🇪', country_code: 'AE' },
  { name: 'Bali', country: 'Indonesia', latitude: -8.3405, longitude: 115.0920, emoji: '🇮🇩', country_code: 'ID' },
  { name: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, emoji: '🇹🇭', country_code: 'TH' },
  { name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, emoji: '🇦🇺', country_code: 'AU' },
  { name: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, emoji: '🇹🇷', country_code: 'TR' },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, emoji: '🇸🇬', country_code: 'SG' },
]

export function LocationDropdown({
  value,
  onChange,
  placeholder = "Search for a location...",
  className,
  allowCurrentLocation = true,
  showPopularDestinations = true
}: LocationDropdownProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isSelectingRef = useRef(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Update dropdown position when open
  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      setDropdownPos(null)
      return
    }
    const updatePos = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 6 + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [isOpen, query, results.length])

  // Sync query with external value
  useEffect(() => {
    if (value?.display_name) {
      setQuery(value.display_name)
      setIsOpen(false)
    } else if (!value) {
      setQuery('')
    }
  }, [value])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      const inContainer = containerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inContainer && !inDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside as EventListener)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as EventListener)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (query.length >= 2 && isOpen) {
      searchTimeout.current = setTimeout(() => {
        searchLocations(query)
      }, 400)
    } else if (query.length < 2) {
      setResults([])
    }

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [query, isOpen])

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          limit: '6',
          dedupe: '1',
          'accept-language': 'en',
          addressdetails: '1'
        })
      )

      if (!response.ok) throw new Error('Search failed')

      const data: LocationResult[] = await response.json()
      setResults(data)
    } catch (err) {
      handleNetworkError(err, { component: 'LocationDropdown', action: 'search' }, 'location search')
      setError('Search failed. Check your connection.')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const selectLocation = useCallback((result: LocationResult) => {
    isSelectingRef.current = true
    const latitude = parseFloat(result.lat)
    const longitude = parseFloat(result.lon)

    if (!isValidTravelDestination(latitude, longitude)) {
      setError('Invalid coordinates. Try another location.')
      isSelectingRef.current = false
      return
    }

    const locationData: LocationData = {
      latitude,
      longitude,
      display_name: sanitizeLocationInput(result.display_name),
      place_id: result.place_id,
      country_code: result.address?.country_code?.toUpperCase() || undefined,
    }

    const validation = validateLocationData(locationData)
    if (!validation.isValid) {
      setError(`Invalid: ${validation.errors.join(', ')}`)
      isSelectingRef.current = false
      return
    }

    onChange(locationData)
    setQuery(locationData.display_name)
    setIsOpen(false)
    setError(null)
    setTimeout(() => { isSelectingRef.current = false }, 100)
  }, [onChange])

  const selectPopularDestination = useCallback((dest: PopularDestination) => {
    isSelectingRef.current = true
    const locationData: LocationData = {
      latitude: dest.latitude,
      longitude: dest.longitude,
      display_name: `${dest.name}, ${dest.country}`,
      country_code: dest.country_code,
    }

    onChange(locationData)
    setQuery(locationData.display_name)
    setIsOpen(false)
    setError(null)
    setTimeout(() => { isSelectingRef.current = false }, 100)
  }, [onChange])

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            new URLSearchParams({
              lat: latitude.toString(),
              lon: longitude.toString(),
              format: 'json',
              addressdetails: '1',
              'accept-language': 'en'
            })
          )

          const data = response.ok ? await response.json() : null
          const locationData: LocationData = {
            latitude,
            longitude,
            display_name: data?.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            place_id: data?.place_id,
            country_code: data?.address?.country_code?.toUpperCase() || undefined,
          }
          onChange(locationData)
          setQuery(locationData.display_name)
          setIsOpen(false)
        } catch {
          const locationData: LocationData = {
            latitude,
            longitude,
            display_name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          }
          onChange(locationData)
          setQuery(locationData.display_name)
          setIsOpen(false)
        }
        setIsGettingLocation(false)
      },
      (err) => {
        log.error('Geolocation error', { component: 'LocationDropdown' }, err as unknown as Error)
        setError(err.code === err.PERMISSION_DENIED ? 'Location access denied' : 'Could not get location')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [onChange])

  const clearLocation = useCallback(() => {
    onChange(null)
    setQuery('')
    setIsOpen(false)
    setResults([])
    inputRef.current?.focus()
  }, [onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = sanitizeLocationInput(e.target.value)
    setQuery(newQuery)
    setError(null)

    if (!newQuery.trim()) {
      onChange(null)
      setIsOpen(false)
    } else {
      if (value?.display_name && newQuery !== value.display_name) {
        onChange(null)
      }
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    if (!isSelectingRef.current && !value) {
      setIsOpen(true)
    }
  }

  // Shorten display names
  const formatName = (name: string) => {
    const parts = name.split(',').map(p => p.trim())
    if (parts.length <= 2) return name
    // Show first part, country (last part), maybe one middle
    if (parts.length === 3) return `${parts[0]}, ${parts[1]}, ${parts[2]}`
    return `${parts[0]}, ${parts[1]}, ${parts[parts.length - 1]}`
  }

  const showPopular = showPopularDestinations && isOpen && query.length < 2 && results.length === 0

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-10 h-11",
              "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700",
              "focus:border-olive-400 dark:focus:border-olive-600 focus:ring-2 focus:ring-olive-500/10",
              "placeholder:text-stone-400 dark:placeholder:text-stone-500"
            )}
            autoComplete="off"
            aria-label="Search location"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-olive-500" />
          )}
          {!isSearching && query && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); clearLocation() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              aria-label="Clear"
            >
              <X className="h-4 w-4 text-stone-400" />
            </button>
          )}
        </div>

        {allowCurrentLocation && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="h-11 w-11 shrink-0 border-stone-200 dark:border-stone-700"
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

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 mt-1.5 px-1">{error}</p>
      )}

      {/* Dropdown via portal to escape overflow-hidden parents */}
      {isOpen && mounted && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl overflow-hidden max-h-[320px] overflow-y-auto"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            position: 'absolute',
          }}
        >
          {/* Search Results */}
          {query.length >= 2 && results.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-700/50">
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Results</p>
              </div>
              {results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectLocation(result) }}
                  className="w-full text-left px-3 py-3 hover:bg-olive-50 dark:hover:bg-olive-900/20 active:bg-olive-100 dark:active:bg-olive-900/30 transition-colors border-b border-stone-100 dark:border-stone-800 last:border-b-0 flex items-start gap-3"
                >
                  <MapPin className="h-4 w-4 text-olive-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-stone-800 dark:text-stone-200 leading-snug">
                    {formatName(result.display_name)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Searching indicator */}
          {query.length >= 2 && isSearching && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-olive-500 mx-auto mb-2" />
              <p className="text-sm text-stone-400">Searching...</p>
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <MapPin className="h-5 w-5 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-500">No results for &quot;{query}&quot;</p>
              <p className="text-xs text-stone-400 mt-1">Try a different spelling or city name</p>
            </div>
          )}

          {/* Popular Destinations */}
          {showPopular && (
            <div>
              <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-700/50">
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">Popular destinations</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {POPULAR_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.name}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectPopularDestination(dest) }}
                    className="text-left px-3 py-2.5 hover:bg-olive-50 dark:hover:bg-olive-900/20 active:bg-olive-100 dark:active:bg-olive-900/30 transition-colors border-b border-stone-100 dark:border-stone-800 sm:odd:border-r flex items-center gap-2.5"
                  >
                    <span className="text-base leading-none">{dest.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{dest.name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{dest.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
