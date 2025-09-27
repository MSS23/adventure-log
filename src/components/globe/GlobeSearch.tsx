'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, MapPin, Calendar, Camera, Navigation, Clock, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { weatherService } from '@/lib/services/weatherService'

export interface GlobeSearchResult {
  id: string
  name: string
  latitude: number
  longitude: number
  country: string
  visitDate: string
  albumCount: number
  photoCount: number
  coverPhotoUrl?: string
  tags: string[]
  type: 'location' | 'country' | 'year' | 'external'
  isExternal?: boolean
}

interface GlobeSearchProps {
  data: GlobeSearchResult[]
  onResultClick: (result: GlobeSearchResult) => void
  onClearSearch: () => void
  placeholder?: string
  maxResults?: number
  className?: string
}

export function GlobeSearch({
  data,
  onResultClick,
  onClearSearch,
  placeholder = 'Search locations, countries, or years...',
  maxResults = 8,
  className
}: GlobeSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobeSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchingExternal, setSearchingExternal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Search function with multiple criteria
  const searchData = useCallback((searchQuery: string): GlobeSearchResult[] => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()

    // First, search local data
    const localResults = data
      .filter(item => {
        // Search in name, country, and tags
        const nameMatch = item.name.toLowerCase().includes(query)
        const countryMatch = item.country.toLowerCase().includes(query)
        const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(query))
        const yearMatch = item.visitDate.includes(query)

        return nameMatch || countryMatch || tagMatch || yearMatch
      })
      .sort((a, b) => {
        // Prioritize exact name matches
        const aNameMatch = a.name.toLowerCase().startsWith(query)
        const bNameMatch = b.name.toLowerCase().startsWith(query)
        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1

        // Then by photo count (more popular locations first)
        return b.photoCount - a.photoCount
      })
      .slice(0, maxResults)

    return localResults
  }, [data, maxResults])

  // External search for locations not in user data
  const searchExternalLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) return

    setSearchingExternal(true)
    try {
      const location = await weatherService.getLocationCoordinates(searchQuery)
      if (location) {
        const externalResult: GlobeSearchResult = {
          id: `external-${location.name}-${location.latitude}-${location.longitude}`,
          name: location.name || searchQuery,
          latitude: location.latitude,
          longitude: location.longitude,
          country: location.country || 'Unknown',
          visitDate: new Date().toISOString(),
          albumCount: 0,
          photoCount: 0,
          tags: ['external'],
          type: 'external',
          isExternal: true
        }

        // Only add if we don't already have local results for this query
        setResults(() => {
          const localResults = searchData(searchQuery)
          if (localResults.length === 0) {
            return [externalResult]
          }
          // Add external result after local results, but limit total
          return [...localResults, externalResult].slice(0, maxResults)
        })
        setIsOpen(true)
      }
    } catch (error) {
      console.error('External location search failed:', error)
    } finally {
      setSearchingExternal(false)
    }
  }, [searchData, maxResults])

  // Event handlers
  const handleResultSelect = useCallback((result: GlobeSearchResult) => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    onResultClick(result)
    inputRef.current?.blur()
  }, [onResultClick])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    onClearSearch()
  }, [onClearSearch])

  // Handle search input
  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = searchData(query)
      setResults(searchResults)
      setIsOpen(searchResults.length > 0)
      setSelectedIndex(-1)

      // If no local results and query is long enough, search external locations
      if (searchResults.length === 0 && query.length >= 3) {
        const debounceTimeout = setTimeout(() => {
          searchExternalLocations(query)
        }, 500) // Debounce external API calls

        return () => clearTimeout(debounceTimeout)
      }
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query, data, searchData, searchExternalLocations])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, -1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultSelect(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          handleClear()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, results, selectedIndex, handleResultSelect, handleClear])

  // Scroll selected result into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [selectedIndex])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  const getResultIcon = (result: GlobeSearchResult) => {
    switch (result.type) {
      case 'country':
        return <Navigation className="h-4 w-4 text-blue-600" />
      case 'year':
        return <Calendar className="h-4 w-4 text-purple-600" />
      case 'external':
        return <ExternalLink className="h-4 w-4 text-orange-600" />
      default:
        return <MapPin className="h-4 w-4 text-green-600" />
    }
  }

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-12 pr-12 h-12 bg-white/80 dark:bg-gray-800/80 border-gray-300/50 dark:border-gray-600/50 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl backdrop-blur-sm transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        {searchingExternal && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
              </div>
              <div className="absolute inset-0 rounded-lg border border-orange-300/50 animate-pulse"></div>
            </div>
          </div>
        )}
        {query && !searchingExternal && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-400"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Enhanced Search Results */}
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl border-gray-200/50 dark:border-gray-700/50 bg-white/98 dark:bg-gray-800/98 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={resultsRef}
              className="max-h-80 overflow-y-auto"
              role="listbox"
            >
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0 transition-all duration-200 group min-h-16',
                    selectedIndex === index && 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
                  )}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex items-start gap-3">
                    {result.coverPhotoUrl && (
                      <div className="flex-shrink-0">
                        <Image
                          src={result.coverPhotoUrl}
                          alt={result.name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-lg flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 dark:group-hover:from-indigo-900/60 dark:group-hover:to-purple-900/60 transition-all duration-200">
                          {getResultIcon(result)}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                          {result.name}
                        </span>
                      </div>

                      <div className="text-sm text-gray-800 dark:text-gray-300 mb-2">
                        {result.country} {result.isExternal ? '• External location' : `• ${formatDate(result.visitDate)}`}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {result.isExternal ? (
                          <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Explore location
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300">
                              <Camera className="h-3 w-3 mr-1" />
                              {result.photoCount}
                            </Badge>

                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                              <Clock className="h-3 w-3 mr-1" />
                              {result.albumCount} album{result.albumCount !== 1 ? 's' : ''}
                            </Badge>

                            {result.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300">
                                {tag}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {results.length === maxResults && (
              <div className="p-4 text-center text-sm bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800/50 dark:to-indigo-950/50 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium">Showing first {maxResults} results. Try a more specific search.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl border-gray-200/50 dark:border-gray-700/50 bg-white/98 dark:bg-gray-800/98 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">No locations found</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Try searching for a city, country, or year
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Search Suggestions */}
      {!query && inputRef.current === document.activeElement && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl border-gray-200/50 dark:border-gray-700/50 bg-white/98 dark:bg-gray-800/98 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Search className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick search suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300"
                onClick={() => setQuery('2024')}
              >
                2024
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300"
                onClick={() => setQuery('Japan')}
              >
                Japan
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 transition-all duration-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700"
                onClick={() => setQuery('Lake Garda')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Lake Garda
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300"
                onClick={() => setQuery('beach')}
              >
                beach
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/30 dark:hover:to-cyan-900/30 transition-all duration-200 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 text-teal-700 dark:text-teal-300"
                onClick={() => setQuery('mountains')}
              >
                mountains
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}