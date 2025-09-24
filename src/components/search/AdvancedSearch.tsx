'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Search,
  Filter,
  Calendar,
  MapPin,
  Camera,
  Globe,
  Star,
  Clock,
  BookmarkPlus,
  Trash2,
  TrendingUp,
  X,
  SlidersHorizontal,
  History,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Album, Photo } from '@/types/database'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'
import Image from 'next/image'

interface SearchFilters {
  query: string
  dateRange: {
    from?: string
    to?: string
  }
  locations: string[]
  tags: string[]
  albumIds: string[]
  photoTypes: string[]
  sortBy: 'relevance' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
  hasLocation: boolean | null
  hasPhotos: boolean | null
  visibility: 'all' | 'public' | 'private' | 'friends'
}

interface SearchResult {
  id: string
  type: 'album' | 'photo' | 'location'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  date?: string
  matchReason: string[]
  relevanceScore: number
}

interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
  lastUsed: string
  useCount: number
}

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void
  initialQuery?: string
  className?: string
}

const defaultFilters: SearchFilters = {
  query: '',
  dateRange: {},
  locations: [],
  tags: [],
  albumIds: [],
  photoTypes: [],
  sortBy: 'relevance',
  hasLocation: null,
  hasPhotos: null,
  visibility: 'all'
}

export function AdvancedSearch({ onResultSelect, initialQuery = '', className }: AdvancedSearchProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    query: initialQuery
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [saveSearchOpen, setSaveSearchOpen] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Popular search terms (could be fetched from analytics)
  const popularSearches = ['Paris', 'Summer 2024', 'Beach', 'Mountains', 'Food', 'Sunset', 'Architecture']

  // Load search history and saved searches
  useEffect(() => {
    const loadSearchData = async () => {
      if (!user) return

      try {
        // Load search history from localStorage for now
        const history = localStorage.getItem(`search-history-${user.id}`)
        if (history) {
          setSearchHistory(JSON.parse(history))
        }

        // In a real app, you'd load saved searches from the database
        const savedSearchesKey = `saved-searches-${user.id}`
        const saved = localStorage.getItem(savedSearchesKey)
        if (saved) {
          setSavedSearches(JSON.parse(saved))
        }
      } catch (error) {
        log.error('Failed to load search data', { error })
      }
    }

    loadSearchData()
  }, [user])

  // Update suggestions based on query
  useEffect(() => {
    if (filters.query.length > 1) {
      const querySuggestions = [
        ...popularSearches.filter(term =>
          term.toLowerCase().includes(filters.query.toLowerCase())
        ),
        ...searchHistory.filter(term =>
          term.toLowerCase().includes(filters.query.toLowerCase()) &&
          term !== filters.query
        )
      ].slice(0, 5)

      setSuggestions(querySuggestions)
    } else {
      setSuggestions([])
    }
  }, [filters.query, searchHistory])

  // Perform search
  const performSearch = useCallback(async () => {
    if (!filters.query.trim() && Object.values(filters).every(v =>
      v === '' || v === null || (Array.isArray(v) && v.length === 0) || v === 'all' || v === 'relevance'
    )) {
      setResults([])
      return
    }

    setIsSearching(true)

    try {
      // Add to search history
      if (filters.query.trim()) {
        const newHistory = [filters.query, ...searchHistory.filter(q => q !== filters.query)].slice(0, 10)
        setSearchHistory(newHistory)
        localStorage.setItem(`search-history-${user?.id}`, JSON.stringify(newHistory))
      }

      // Search albums
      const albumResults = await searchAlbums(filters)

      // Search photos
      const photoResults = await searchPhotos(filters)

      // Combine and sort results
      const allResults = [...albumResults, ...photoResults].sort((a, b) =>
        filters.sortBy === 'relevance'
          ? b.relevanceScore - a.relevanceScore
          : filters.sortBy === 'date-desc'
          ? new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
          : filters.sortBy === 'date-asc'
          ? new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
          : filters.sortBy === 'name-asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      )

      setResults(allResults)
    } catch (error) {
      log.error('Search failed', { error, filters })
    } finally {
      setIsSearching(false)
    }
  }, [filters, searchHistory, user])

  const searchAlbums = async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    let query = supabase
      .from('albums')
      .select(`
        id, title, description, cover_photo_url, location_name,
        created_at, start_date, end_date, visibility, tags
      `)
      .eq('user_id', user?.id)

    // Apply filters
    if (searchFilters.query) {
      query = query.or(`title.ilike.%${searchFilters.query}%,description.ilike.%${searchFilters.query}%,location_name.ilike.%${searchFilters.query}%`)
    }

    if (searchFilters.dateRange.from) {
      query = query.gte('start_date', searchFilters.dateRange.from)
    }
    if (searchFilters.dateRange.to) {
      query = query.lte('end_date', searchFilters.dateRange.to)
    }

    if (searchFilters.locations.length > 0) {
      const locationFilter = searchFilters.locations.map(loc => `location_name.ilike.%${loc}%`).join(',')
      query = query.or(locationFilter)
    }

    if (searchFilters.visibility !== 'all') {
      query = query.eq('visibility', searchFilters.visibility)
    }

    const { data: albums } = await query.limit(20)

    return (albums || []).map(album => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      description: album.description,
      imageUrl: album.cover_photo_url,
      location: album.location_name,
      date: album.start_date || album.created_at,
      matchReason: getMatchReasons(album as Album, searchFilters),
      relevanceScore: calculateRelevanceScore(album as Album, searchFilters)
    }))
  }

  const searchPhotos = async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    let query = supabase
      .from('photos')
      .select(`
        id, caption, file_path, city, country, taken_at, created_at,
        album_id, albums!inner(title, user_id)
      `)
      .eq('albums.user_id', user?.id)

    // Apply filters
    if (searchFilters.query) {
      query = query.or(`caption.ilike.%${searchFilters.query}%,city.ilike.%${searchFilters.query}%,country.ilike.%${searchFilters.query}%`)
    }

    if (searchFilters.hasLocation) {
      query = query.not('latitude', 'is', null)
    }

    const { data: photos } = await query.limit(20)

    return (photos || []).map(photo => ({
      id: photo.id,
      type: 'photo' as const,
      title: photo.caption || 'Untitled Photo',
      description: `From album: ${(photo.albums as Album).title}`,
      imageUrl: photo.file_path,
      location: photo.city && photo.country ? `${photo.city}, ${photo.country}` : photo.city || photo.country,
      date: photo.taken_at || photo.created_at,
      matchReason: getPhotoMatchReasons(photo, searchFilters),
      relevanceScore: calculatePhotoRelevanceScore(photo, searchFilters)
    }))
  }

  const getMatchReasons = (album: Album, searchFilters: SearchFilters): string[] => {
    const reasons: string[] = []
    const query = searchFilters.query.toLowerCase()

    if (album.title.toLowerCase().includes(query)) reasons.push('Title match')
    if (album.description?.toLowerCase().includes(query)) reasons.push('Description match')
    if (album.location_name?.toLowerCase().includes(query)) reasons.push('Location match')

    return reasons
  }

  const getPhotoMatchReasons = (photo: Photo, searchFilters: SearchFilters): string[] => {
    const reasons: string[] = []
    const query = searchFilters.query.toLowerCase()

    if (photo.caption?.toLowerCase().includes(query)) reasons.push('Caption match')
    if (photo.city?.toLowerCase().includes(query)) reasons.push('City match')
    if (photo.country?.toLowerCase().includes(query)) reasons.push('Country match')

    return reasons
  }

  const calculateRelevanceScore = (album: Album, searchFilters: SearchFilters): number => {
    let score = 0
    const query = searchFilters.query.toLowerCase()

    // Title matches get higher score
    if (album.title.toLowerCase().includes(query)) score += 10
    if (album.title.toLowerCase().startsWith(query)) score += 5

    // Description matches
    if (album.description?.toLowerCase().includes(query)) score += 5

    // Location matches
    if (album.location_name?.toLowerCase().includes(query)) score += 7

    // Recency bonus
    const daysSinceCreated = (Date.now() - new Date(album.created_at).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.max(0, 30 - daysSinceCreated) * 0.1

    return score
  }

  const calculatePhotoRelevanceScore = (photo: Photo, searchFilters: SearchFilters): number => {
    let score = 0
    const query = searchFilters.query.toLowerCase()

    if (photo.caption?.toLowerCase().includes(query)) score += 8
    if (photo.city?.toLowerCase().includes(query)) score += 6
    if (photo.country?.toLowerCase().includes(query)) score += 4

    return score
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.query || Object.values(filters).some(v =>
        v !== defaultFilters[v as keyof SearchFilters] &&
        !(Array.isArray(v) && v.length === 0)
      )) {
        performSearch()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, performSearch])

  const updateFilter = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addLocationFilter = (location: string) => {
    if (!filters.locations.includes(location)) {
      updateFilter('locations', [...filters.locations, location])
    }
  }

  const removeLocationFilter = (location: string) => {
    updateFilter('locations', filters.locations.filter(l => l !== location))
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const saveSearch = async () => {
    if (!searchName.trim() || !user) return

    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1
    }

    const newSavedSearches = [...savedSearches, savedSearch]
    setSavedSearches(newSavedSearches)
    localStorage.setItem(`saved-searches-${user.id}`, JSON.stringify(newSavedSearches))

    setSearchName('')
    setSaveSearchOpen(false)
  }

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters)

    // Update usage statistics
    const updatedSearches = savedSearches.map(s =>
      s.id === savedSearch.id
        ? { ...s, lastUsed: new Date().toISOString(), useCount: s.useCount + 1 }
        : s
    )
    setSavedSearches(updatedSearches)
    localStorage.setItem(`saved-searches-${user?.id}`, JSON.stringify(updatedSearches))
  }

  const deleteSavedSearch = (searchId: string) => {
    const newSavedSearches = savedSearches.filter(s => s.id !== searchId)
    setSavedSearches(newSavedSearches)
    localStorage.setItem(`saved-searches-${user?.id}`, JSON.stringify(newSavedSearches))
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Advanced Search
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-blue-50 border-blue-200")}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {savedSearches.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      Saved
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Saved Searches</DialogTitle>
                      <DialogDescription>
                        Quickly access your frequently used searches
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {savedSearches.map(search => (
                        <div key={search.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium">{search.name}</p>
                            <p className="text-xs text-gray-500">
                              Used {search.useCount} times, last used {new Date(search.lastUsed).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => loadSavedSearch(search)}>
                              Load
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteSavedSearch(search.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              placeholder="Search albums, photos, locations..."
              className="pl-10 pr-4"
            />
            {filters.query && suggestions.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-50 mt-1">
                <CardContent className="p-2">
                  {suggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                      onClick={() => updateFilter('query', suggestion)}
                    >
                      <Search className="h-3 w-3 inline mr-2" />
                      {suggestion}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Active Filters Display */}
          {(filters.locations.length > 0 || filters.tags.length > 0 || filters.dateRange.from) && (
            <div className="flex flex-wrap gap-2">
              {filters.locations.map(location => (
                <Badge key={location} variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                  <button onClick={() => removeLocationFilter(location)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.dateRange.from && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.dateRange.from} - {filters.dateRange.to || 'now'}
                  <button onClick={() => updateFilter('dateRange', {})}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Quick Search Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Quick searches:</span>
              {popularSearches.slice(0, 4).map(term => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('query', term)}
                >
                  {term}
                </Button>
              ))}
            </div>

            {searchHistory.length > 0 && (
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Recent:</span>
                {searchHistory.slice(0, 3).map(term => (
                  <Button
                    key={term}
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter('query', term)}
                    className="text-xs"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={filters.dateRange.from || ''}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={filters.dateRange.to || ''}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={filters.sortBy} onValueChange={(value: string) => updateFilter('sortBy', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date-desc">Date (Newest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select value={filters.visibility} onValueChange={(value: string) => updateFilter('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Filters */}
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium">Quick Filters</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filters.hasLocation ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('hasLocation', filters.hasLocation ? null : true)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Has Location
                    </Button>
                    <Button
                      variant={filters.hasPhotos ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('hasPhotos', filters.hasPhotos ? null : true)}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Has Photos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Results {results.length > 0 && `(${results.length})`}
            </CardTitle>
            <div className="flex items-center gap-2">
              {filters.query && (
                <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      Save Search
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Search</DialogTitle>
                      <DialogDescription>
                        Give this search a name to save it for later
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Search name..."
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSaveSearchOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveSearch} disabled={!searchName.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filters.query || Object.values(filters).some(v =>
                  v !== defaultFilters[v as keyof SearchFilters] &&
                  !(Array.isArray(v) && v.length === 0)
                ) ? 'No results found' : 'Start searching'}
              </p>
              <p className="text-sm">
                {filters.query ? 'Try adjusting your search terms or filters' : 'Enter a search term or use filters to find your content'}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  All ({results.length})
                </TabsTrigger>
                <TabsTrigger value="albums">
                  Albums ({results.filter(r => r.type === 'album').length})
                </TabsTrigger>
                <TabsTrigger value="photos">
                  Photos ({results.filter(r => r.type === 'photo').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <SearchResultsList results={results} onResultSelect={onResultSelect} />
              </TabsContent>

              <TabsContent value="albums" className="mt-4">
                <SearchResultsList
                  results={results.filter(r => r.type === 'album')}
                  onResultSelect={onResultSelect}
                />
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <SearchResultsList
                  results={results.filter(r => r.type === 'photo')}
                  onResultSelect={onResultSelect}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface SearchResultsListProps {
  results: SearchResult[]
  onResultSelect?: (result: SearchResult) => void
}

function SearchResultsList({ results, onResultSelect }: SearchResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No results in this category</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <SearchResultCard
          key={`${result.type}-${result.id}`}
          result={result}
          onSelect={onResultSelect}
        />
      ))}
    </div>
  )
}

interface SearchResultCardProps {
  result: SearchResult
  onSelect?: (result: SearchResult) => void
}

function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(result)
    } else {
      // Default navigation
      const url = result.type === 'album'
        ? `/albums/${result.id}`
        : `/albums/${result.id}?photo=${result.id}`
      window.location.href = url
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Result Image */}
      <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
        {result.imageUrl ? (
          <Image
            src={result.imageUrl}
            alt={result.title}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {result.type === 'album' ? (
              <Camera className="h-6 w-6 text-gray-400" />
            ) : (
              <Globe className="h-6 w-6 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Result Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {result.title}
            </h3>
            {result.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {result.description}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            {result.type}
          </Badge>
        </div>

        {/* Meta Information */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {result.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{result.location}</span>
            </div>
          )}
          {result.date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(result.date).toLocaleDateString()}</span>
            </div>
          )}
          {result.matchReason.length > 0 && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>{result.matchReason.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}