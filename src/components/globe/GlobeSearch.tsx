'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, MapPin, Calendar, Camera, Navigation, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Image from 'next/image'

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
  type: 'location' | 'country' | 'year'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Search function with multiple criteria
  const searchData = (searchQuery: string): GlobeSearchResult[] => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()

    return data
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
  }

  // Handle search input
  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = searchData(query)
      setResults(searchResults)
      setIsOpen(searchResults.length > 0)
      setSelectedIndex(-1)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query, data])

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
  }, [isOpen, results, selectedIndex])

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

  const handleResultSelect = (result: GlobeSearchResult) => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    onResultClick(result)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    onClearSearch()
    inputRef.current?.focus()
  }

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
      default:
        return <MapPin className="h-4 w-4 text-green-600" />
    }
  }

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-white/95 backdrop-blur-sm border-gray-200 focus:border-blue-500"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border-gray-200 bg-white/98 backdrop-blur-sm">
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
                    'w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors',
                    selectedIndex === index && 'bg-blue-50'
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
                        {getResultIcon(result)}
                        <span className="font-medium text-gray-900 truncate">
                          {result.name}
                        </span>
                      </div>

                      <div className="text-sm text-gray-800 mb-2">
                        {result.country} • {formatDate(result.visitDate)}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-sm">
                          <Camera className="h-3 w-3 mr-1" />
                          {result.photoCount}
                        </Badge>

                        <Badge variant="outline" className="text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {result.albumCount} album{result.albumCount !== 1 ? 's' : ''}
                        </Badge>

                        {result.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {results.length === maxResults && (
              <div className="p-3 text-center text-sm text-gray-800 border-t">
                Showing first {maxResults} results. Try a more specific search.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border-gray-200 bg-white/98 backdrop-blur-sm">
          <CardContent className="p-4 text-center text-gray-800">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">No locations found</p>
            <p className="text-sm mt-1">
              Try searching for a city, country, or year
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search Suggestions */}
      {!query && inputRef.current === document.activeElement && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border-gray-200 bg-white/98 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-sm text-gray-800 mb-3">Quick search suggestions:</div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setQuery('2024')}
              >
                2024
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setQuery('Japan')}
              >
                Japan
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setQuery('beach')}
              >
                beach
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
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