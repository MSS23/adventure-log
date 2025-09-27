'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Calendar,
  MapPin,
  Camera,
  Globe,
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
import { log } from '@/lib/utils/logger'
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
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [saveSearchOpen, setSaveSearchOpen] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Popular search terms (could be fetched from analytics)
  const popularSearches = useMemo(() => ['Paris', 'Summer 2024', 'Beach', 'Mountains', 'Food', 'Sunset', 'Architecture'], [])

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
  }, [filters.query, searchHistory, popularSearches])

  // Search functions
  const searchAlbums = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    let query = supabase
      .from('albums')
      .select(`
        id,
        title,
        description,
        created_at,
        location,
        photo_count,
        cover_photo_url,
        is_public,
        user_profiles!inner(username)
      `)

    // Apply filters
    if (searchFilters.query) {
      query = query.or(`title.ilike.%${searchFilters.query}%,description.ilike.%${searchFilters.query}%,location.ilike.%${searchFilters.query}%`)
    }

    if (searchFilters.locations && searchFilters.locations.length > 0) {
      const locationConditions = searchFilters.locations.map(loc => `location.ilike.%${loc}%`).join(',')
      query = query.or(locationConditions)
    }

    if (searchFilters.dateRange && (searchFilters.dateRange.from || searchFilters.dateRange.to)) {
      if (searchFilters.dateRange.from) {
        query = query.gte('created_at', new Date(searchFilters.dateRange.from).toISOString())
      }
      if (searchFilters.dateRange.to) {
        query = query.lte('created_at', new Date(searchFilters.dateRange.to).toISOString())
      }
    }

    if (searchFilters.visibility && searchFilters.visibility !== 'all') {
      if (searchFilters.visibility === 'public') {
        query = query.eq('is_public', true)
      } else if (searchFilters.visibility === 'private') {
        query = query.eq('is_public', false)
      }
      // Note: 'friends' visibility would require additional logic for friend relationships
    }

    // Apply sorting
    switch (searchFilters.sortBy) {
      case 'date-desc':
        query = query.order('created_at', { ascending: false })
        break
      case 'date-asc':
        query = query.order('created_at', { ascending: true })
        break
      case 'name-asc':
        query = query.order('title', { ascending: true })
        break
      case 'name-desc':
        query = query.order('title', { ascending: false })
        break
      case 'relevance':
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.limit(50)

    if (error) throw error

    return (data || []).map(album => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      description: album.description || '',
      imageUrl: album.cover_photo_url || '',
      location: album.location || '',
      date: album.created_at,
      matchReason: ['Title match'], // Would be calculated based on search query matching
      relevanceScore: 1 // Would be calculated based on search query matching
    }))
  }, [supabase])

  const searchPhotos = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    let query = supabase
      .from('photos')
      .select(`
        id,
        title,
        description,
        url,
        created_at,
        location,
        metadata,
        is_public,
        albums!inner(title, user_profiles!inner(username))
      `)

    // Apply filters
    if (searchFilters.query) {
      query = query.or(`title.ilike.%${searchFilters.query}%,description.ilike.%${searchFilters.query}%,location.ilike.%${searchFilters.query}%`)
    }

    if (searchFilters.locations && searchFilters.locations.length > 0) {
      const locationConditions = searchFilters.locations.map(loc => `location.ilike.%${loc}%`).join(',')
      query = query.or(locationConditions)
    }

    if (searchFilters.dateRange && (searchFilters.dateRange.from || searchFilters.dateRange.to)) {
      if (searchFilters.dateRange.from) {
        query = query.gte('created_at', new Date(searchFilters.dateRange.from).toISOString())
      }
      if (searchFilters.dateRange.to) {
        query = query.lte('created_at', new Date(searchFilters.dateRange.to).toISOString())
      }
    }

    if (searchFilters.visibility && searchFilters.visibility !== 'all') {
      if (searchFilters.visibility === 'public') {
        query = query.eq('is_public', true)
      } else if (searchFilters.visibility === 'private') {
        query = query.eq('is_public', false)
      }
      // Note: 'friends' visibility would require additional logic for friend relationships
    }

    // Apply sorting
    switch (searchFilters.sortBy) {
      case 'date-desc':
        query = query.order('created_at', { ascending: false })
        break
      case 'date-asc':
        query = query.order('created_at', { ascending: true })
        break
      case 'name-asc':
        query = query.order('title', { ascending: true })
        break
      case 'name-desc':
        query = query.order('title', { ascending: false })
        break
      case 'relevance':
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.limit(50)

    if (error) throw error

    return (data || []).map(photo => ({
      id: photo.id,
      type: 'photo' as const,
      title: photo.title || 'Untitled Photo',
      description: photo.description || '',
      imageUrl: photo.url,
      location: photo.location || '',
      date: photo.created_at,
      matchReason: ['Title match'], // Would be calculated based on search query matching
      relevanceScore: 1 // Would be calculated based on search query matching
    }))
  }, [supabase])

  // Perform search
  const performSearch = useCallback(async () => {
    if (!filters.query.trim() && Object.values(filters).every(v =>
      v === '' || v === null || (Array.isArray(v) && v.length === 0) || v === 'all' || v === 'relevance'
    )) {
      setResults([])
      setSearchError(null)
      return
    }

    setIsSearching(true)
    setSearchError(null)

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
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [filters, searchHistory, user, searchAlbums, searchPhotos])

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
      {/* Enhanced Search Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Search className="h-5 w-5 text-white" />
              </div>
              Advanced Search
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-gray-300/50 dark:border-gray-600/50 backdrop-blur-sm transition-all duration-200 min-h-11",
                  showFilters && "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-300 dark:border-indigo-600"
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span className="font-medium">Filters</span>
              </Button>
              {savedSearches.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-gray-300/50 dark:border-gray-600/50 backdrop-blur-sm transition-all duration-200 min-h-11"
                    >
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      <span className="font-medium">Saved</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-gradient-to-br from-white via-gray-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 border-0 shadow-2xl">
                    <DialogHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 -m-6 p-6 mb-6 border-b border-gray-200/50 dark:border-gray-700/50">
                      <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <BookmarkPlus className="h-4 w-4 text-white" />
                        </div>
                        Saved Searches
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
                        Quickly access your frequently used searches
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {savedSearches.map(search => (
                        <div key={search.id} className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                          <div className="flex-1">
                            <p className="font-medium dark:text-white">{search.name}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-300">
                              Used {search.useCount} times, last used {new Date(search.lastUsed).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadSavedSearch(search)}
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-sm"
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteSavedSearch(search.id)}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                            >
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
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Enhanced Main Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <Input
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              placeholder="Search albums, photos, locations..."
              className="pl-12 pr-4 h-14 text-lg bg-white/80 dark:bg-gray-800/80 border-gray-300/50 dark:border-gray-600/50 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl backdrop-blur-sm transition-all duration-200"
            />
            {filters.query && suggestions.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/98 dark:bg-gray-800/98 border-gray-200/50 dark:border-gray-700/50 shadow-xl backdrop-blur-sm rounded-xl overflow-hidden">
                <CardContent className="p-2">
                  {suggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      className="w-full text-left p-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-lg text-sm dark:text-gray-200 transition-all duration-200 flex items-center gap-3"
                      onClick={() => updateFilter('query', suggestion)}
                    >
                      <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium">{suggestion}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Active Filters Display */}
          {(filters.locations.length > 0 || filters.tags.length > 0 || filters.dateRange.from) && (
            <div className="bg-gradient-to-r from-gray-50 via-white to-indigo-50 dark:from-gray-800/50 dark:via-gray-900/50 dark:to-indigo-950/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.locations.map(location => (
                  <Badge key={location} variant="secondary" className="flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700 px-3 py-1.5">
                    <MapPin className="h-3 w-3" />
                    <span className="font-medium">{location}</span>
                    <button
                      onClick={() => removeLocationFilter(location)}
                      className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filters.dateRange.from && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700 px-3 py-1.5">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">{filters.dateRange.from} - {filters.dateRange.to || 'now'}</span>
                    <button
                      onClick={() => updateFilter('dateRange', {})}
                      className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}

          {/* Enhanced Quick Search Options */}
          <div className="space-y-4">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick searches:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.slice(0, 4).map(term => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('query', term)}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>

            {searchHistory.length > 0 && (
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                    <History className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent searches:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 3).map(term => (
                    <Button
                      key={term}
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter('query', term)}
                      className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 text-orange-700 dark:text-orange-300 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 transition-all duration-200 text-sm"
                    >
                      {term}
                    </Button>
                  ))}
                </div>
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
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-indigo-50 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-950 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-gray-200/50 dark:border-gray-700/50">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-white" />
                  </div>
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {/* Date Range */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Date Range
                  </label>
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
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Sort By
                  </label>
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
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Visibility
                  </label>
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
                <div className="space-y-3 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Quick Filters
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={filters.hasLocation ? "default" : "outline"}
                      size="default"
                      onClick={() => updateFilter('hasLocation', filters.hasLocation ? null : true)}
                      className={cn(
                        "transition-all duration-200",
                        filters.hasLocation
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg"
                          : "bg-white/80 dark:bg-gray-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-gray-300/50 dark:border-gray-600/50"
                      )}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Has Location
                    </Button>
                    <Button
                      variant={filters.hasPhotos ? "default" : "outline"}
                      size="default"
                      onClick={() => updateFilter('hasPhotos', filters.hasPhotos ? null : true)}
                      className={cn(
                        "transition-all duration-200",
                        filters.hasPhotos
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                          : "bg-white/80 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-300/50 dark:border-gray-600/50"
                      )}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Has Photos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Search Results */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-purple-950 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Results {results.length > 0 && `(${results.length})`}
            </CardTitle>
            <div className="flex items-center gap-2">
              {filters.query && (
                <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      Save Search
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-gradient-to-br from-white via-gray-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950 border-0 shadow-2xl">
                    <DialogHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 -m-6 p-6 mb-6 border-b border-gray-200/50 dark:border-gray-700/50">
                      <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <BookmarkPlus className="h-3 w-3 text-white" />
                        </div>
                        Save Search
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
                        Give this search a name to save it for later
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Search name..."
                      />
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSaveSearchOpen(false)}
                          className="bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-gray-300/50 dark:border-gray-600/50"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveSearch}
                          disabled={!searchName.trim()}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg disabled:opacity-50"
                        >
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
          {searchError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Search Failed</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed">{searchError}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchError(null)
                  performSearch()
                }}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </Button>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Search className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/30 animate-ping"></div>
              </div>
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Searching...</span>
              <span className="text-sm text-gray-500 dark:text-gray-500 mt-1">Finding your content</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {filters.query || Object.values(filters).some(v =>
                  v !== defaultFilters[v as keyof SearchFilters] &&
                  !(Array.isArray(v) && v.length === 0)
                ) ? 'No results found' : 'Start searching'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                {filters.query ? 'Try adjusting your search terms or filters to find what you\'re looking for' : 'Enter a search term or use filters to find your albums, photos, and locations'}
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
      <div className="text-center py-8 text-gray-800 dark:text-gray-300">
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
      className="flex gap-4 p-6 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={handleClick}
    >
      {/* Enhanced Result Image */}
      <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300">
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
              <Camera className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Globe className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            )}
          </div>
        )}
      </div>

      {/* Result Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
              {result.title}
            </h3>
            {result.description && (
              <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-2 mt-1">
                {result.description}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "ml-3 flex-shrink-0 font-medium transition-all duration-200",
              result.type === 'album'
                ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700"
            )}
          >
            {result.type}
          </Badge>
        </div>

        {/* Meta Information */}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-800 dark:text-gray-400">
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