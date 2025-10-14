'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Calendar,
  MapPin,
  Camera,
  X,
  SlidersHorizontal,
  Lock,
  Globe as GlobeIcon,
  Users,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { log } from '@/lib/utils/logger'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import Link from 'next/link'

interface SearchFilters {
  query: string
  dateRange: {
    from?: string
    to?: string
  }
  locations: string[]
  sortBy: 'relevance' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
  visibility: 'all' | 'public' | 'private' | 'friends'
}

interface SearchResult {
  id: string
  type: 'album' | 'photo'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  date?: string
  visibility: 'public' | 'private' | 'friends'
  userId: string
  username?: string
  relevanceScore: number
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
  sortBy: 'relevance',
  visibility: 'public' // Show public albums by default, excluding private/draft
}

export function AdvancedSearch({ onResultSelect, initialQuery = '', className }: AdvancedSearchProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    query: initialQuery
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Sync with URL search params
  useEffect(() => {
    const query = searchParams.get('q') || ''
    setFilters(prev => ({ ...prev, query }))
  }, [searchParams])

  // Search albums with privacy filtering
  const searchAlbums = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    let query = supabase
      .from('albums')
      .select(`
        id,
        title,
        description,
        created_at,
        date_start,
        location_name,
        cover_photo_url,
        visibility,
        user_id,
        users!inner(id, username, display_name)
      `)
      .neq('status', 'draft')

    // Text search - support title, description, location, and @username
    if (searchFilters.query) {
      const searchTerm = searchFilters.query.trim()

      // Check if searching for username with @ symbol
      if (searchTerm.startsWith('@')) {
        const username = searchTerm.substring(1)
        query = query.ilike('users.username', `%${username}%`)
      } else {
        // Search across title, description, location, and username
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%,users.username.ilike.%${searchTerm}%,users.display_name.ilike.%${searchTerm}%`)
      }
    }

    // Privacy/visibility filtering - ALWAYS filter out private albums from other users
    if (user) {
      if (searchFilters.visibility === 'private') {
        // Only show user's own private albums
        query = query.eq('visibility', 'private').eq('user_id', user.id)
      } else if (searchFilters.visibility === 'all') {
        // Show: 1) All public albums 2) User's own albums (any visibility)
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`)
      } else {
        // Public only - exclude private albums
        query = query.or(`visibility.eq.public,visibility.is.null`)
      }
    } else {
      // Not logged in - only show public albums
      query = query.or(`visibility.eq.public,visibility.is.null`)
    }

    // Location filter
    if (searchFilters.locations.length > 0) {
      const locationConditions = searchFilters.locations.map(loc => `location_name.ilike.%${loc}%`).join(',')
      query = query.or(locationConditions)
    }

    // Date range filter
    if (searchFilters.dateRange.from) {
      query = query.gte('date_start', new Date(searchFilters.dateRange.from).toISOString())
    }
    if (searchFilters.dateRange.to) {
      query = query.lte('date_start', new Date(searchFilters.dateRange.to).toISOString())
    }

    // Sorting
    switch (searchFilters.sortBy) {
      case 'date-desc':
        query = query.order('date_start', { ascending: false, nullsFirst: false })
        break
      case 'date-asc':
        query = query.order('date_start', { ascending: true, nullsFirst: false })
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

    if (error) {
      log.error('Album search failed', { error, filters: searchFilters })
      throw error
    }

    return (data || []).map(album => {
      // Handle users relation - it can be an array or object depending on Supabase query
      const users = Array.isArray(album.users) ? album.users[0] : album.users
      return {
        id: album.id,
        type: 'album' as const,
        title: album.title,
        description: album.description || '',
        imageUrl: album.cover_photo_url || '',
        location: album.location_name || '',
        date: album.date_start || album.created_at,
        visibility: album.visibility as 'public' | 'private' | 'friends',
        userId: album.user_id,
        username: users?.username || users?.display_name || 'Unknown',
        relevanceScore: 1
      }
    })
  }, [supabase, user])

  // Perform search
  const performSearch = useCallback(async () => {
    setIsSearching(true)

    try {
      const albumResults = await searchAlbums(filters)
      setResults(albumResults)
    } catch (error) {
      log.error('Search failed', { error, filters })
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [filters, searchAlbums])

  // Initial load and debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch().then(() => {
        // Scroll to top of results when search completes
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }, filters.query ? 300 : 0) // Immediate load without query, debounced with query

    return () => clearTimeout(timeoutId)
  }, [filters.query, filters.visibility, filters.sortBy, filters.dateRange, filters.locations, performSearch])

  const updateFilter = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    if (key !== 'query') {
      performSearch()
    }
  }

  const removeLocationFilter = (location: string) => {
    const newLocations = filters.locations.filter(l => l !== location)
    setFilters(prev => ({ ...prev, locations: newLocations }))
    performSearch()
  }

  const clearFilters = () => {
    setFilters({ ...defaultFilters, query: filters.query })
    performSearch()
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters Bar */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          {/* Filter Toggle and Active Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-lg"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>

              {/* Active filter badges */}
              {filters.visibility !== 'public' && (
                <Badge variant="secondary" className="gap-1">
                  {filters.visibility === 'all' ? 'All' : filters.visibility === 'private' ? 'Private' : 'Friends'}
                  <button onClick={() => updateFilter('visibility', 'public')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.locations.map(location => (
                <Badge key={location} variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                  <button onClick={() => removeLocationFilter(location)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(filters.dateRange.from || filters.dateRange.to) && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.dateRange.from} - {filters.dateRange.to || 'now'}
                  <button onClick={() => updateFilter('dateRange', {})}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(filters.visibility !== 'public' || filters.locations.length > 0 || filters.dateRange.from) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </div>
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
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date Range</label>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={filters.dateRange.from || ''}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                      placeholder="From"
                      className="rounded-lg"
                    />
                    <Input
                      type="date"
                      value={filters.dateRange.to || ''}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                      placeholder="To"
                      className="rounded-lg"
                    />
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Sort By</label>
                  <Select value={filters.sortBy} onValueChange={(value: string) => updateFilter('sortBy', value)}>
                    <SelectTrigger className="rounded-lg">
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
                  <label className="text-sm font-medium text-gray-700">Visibility</label>
                  <Select value={filters.visibility} onValueChange={(value: string) => updateFilter('visibility', value)}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <GlobeIcon className="h-4 w-4" />
                          Public Only
                        </div>
                      </SelectItem>
                      {user && (
                        <>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              All (Public + Mine)
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              My Private
                            </div>
                          </SelectItem>
                          <SelectItem value="friends">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Friends Only
                            </div>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      {isSearching ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{filters.query ? 'Searching...' : 'Loading albums...'}</p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-gray-500">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filters.query ? 'No results found' : 'No albums available'}
              </p>
              <p className="text-sm">
                {filters.query
                  ? 'Try adjusting your search terms or filters'
                  : 'No public albums to display'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <SearchResultCard
              key={`${result.type}-${result.id}`}
              result={result}
              onSelect={onResultSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SearchResultCardProps {
  result: SearchResult
  onSelect?: (result: SearchResult) => void
}

function SearchResultCard({ result }: SearchResultCardProps) {
  const getVisibilityIcon = () => {
    switch (result.visibility) {
      case 'public':
        return <GlobeIcon className="h-3 w-3" />
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'friends':
        return <Users className="h-3 w-3" />
    }
  }

  const getVisibilityColor = () => {
    switch (result.visibility) {
      case 'public':
        return 'bg-green-100 text-green-700'
      case 'private':
        return 'bg-gray-100 text-gray-700'
      case 'friends':
        return 'bg-blue-100 text-blue-700'
    }
  }

  return (
    <Link href={`/albums/${result.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className="group cursor-pointer"
      >
        <Card className="overflow-hidden border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
          {/* Cover Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            {result.imageUrl && result.visibility === 'public' ? (
              <Image
                src={getPhotoUrl(result.imageUrl) || ''}
                alt={result.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-16 w-16 text-gray-300" />
              </div>
            )}

            {/* Overlay badges */}
            <div className="absolute top-3 right-3 flex gap-2">
              <Badge className={cn("gap-1", getVisibilityColor())}>
                {getVisibilityIcon()}
                <span className="capitalize text-xs">{result.visibility}</span>
              </Badge>
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

            {/* Location badge at bottom */}
            {result.location && (
              <div className="absolute bottom-3 left-3 right-3">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm gap-1 max-w-full">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{result.location}</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-4 space-y-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1 text-lg group-hover:text-blue-600 transition-colors">
                {result.title}
              </h3>
              {result.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {result.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>@{result.username}</span>
              </div>
              {result.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(result.date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
