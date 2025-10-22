'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  type: 'album' | 'photo' | 'user'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  latitude?: number
  longitude?: number
  date?: string
  visibility: 'public' | 'private' | 'friends'
  userId: string
  username?: string
  displayName?: string
  privacyLevel?: 'public' | 'private' | 'friends'
  relevanceScore: number
}

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void
  onWeatherLocationDetected?: (lat: number, lng: number, name: string) => void
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

// Helper function to get country code from country name
function getCountryCode(searchTerm: string): string | null {
  const countryMap: Record<string, string> = {
    'germany': 'DE',
    'united states': 'US',
    'usa': 'US',
    'america': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'britain': 'GB',
    'england': 'GB',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'portugal': 'PT',
    'netherlands': 'NL',
    'holland': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'austria': 'AT',
    'greece': 'GR',
    'turkey': 'TR',
    'poland': 'PL',
    'czechia': 'CZ',
    'czech republic': 'CZ',
    'hungary': 'HU',
    'romania': 'RO',
    'bulgaria': 'BG',
    'croatia': 'HR',
    'slovenia': 'SI',
    'serbia': 'RS',
    'montenegro': 'ME',
    'bosnia': 'BA',
    'denmark': 'DK',
    'sweden': 'SE',
    'norway': 'NO',
    'finland': 'FI',
    'iceland': 'IS',
    'ireland': 'IE',
    'australia': 'AU',
    'canada': 'CA',
    'japan': 'JP',
    'china': 'CN',
    'india': 'IN',
    'brazil': 'BR',
    'mexico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'peru': 'PE',
    'colombia': 'CO',
    'thailand': 'TH',
    'vietnam': 'VN',
    'singapore': 'SG',
    'malaysia': 'MY',
    'indonesia': 'ID',
    'philippines': 'PH',
    'south korea': 'KR',
    'korea': 'KR',
    'new zealand': 'NZ',
    'south africa': 'ZA',
    'egypt': 'EG',
    'morocco': 'MA',
    'kenya': 'KE',
    'uae': 'AE',
    'emirates': 'AE',
    'dubai': 'AE',
    'israel': 'IL',
    'jordan': 'JO',
    'lebanon': 'LB',
    'saudi arabia': 'SA'
  }

  const normalized = searchTerm.toLowerCase().trim()
  return countryMap[normalized] || null
}

export function AdvancedSearch({ onResultSelect, onWeatherLocationDetected, initialQuery = '', className }: AdvancedSearchProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const resultsRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    query: initialQuery
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Sync with URL search params and scroll to results when query changes
  useEffect(() => {
    const query = searchParams.get('q') || ''
    const countryParam = searchParams.get('country')
    const hadQuery = filters.query.length > 0

    // If we have a country parameter, set it as the query
    if (countryParam) {
      setFilters(prev => ({ ...prev, query: countryParam }))
    } else {
      setFilters(prev => ({ ...prev, query }))
    }

    // Scroll to results when user starts typing (goes from empty to having text)
    if ((query || countryParam) && !hadQuery && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams, filters.query])

  // Search users - can search both public and private accounts
  const searchUsers = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    // Only search users if query is present
    if (!searchFilters.query) return []

    const searchTerm = searchFilters.query.trim()
    const username = searchTerm.startsWith('@') ? searchTerm.substring(1) : searchTerm

    let query = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, privacy_level')

    // Search for users by username or display name (both public and private accounts)
    query = query.or(`username.ilike.%${username}%,display_name.ilike.%${username}%`)

    const { data, error } = await query.limit(20)

    if (error) {
      log.error('User search failed', { error, filters: searchFilters })
      return []
    }

    return (data || []).map(user => ({
      id: user.id,
      type: 'user' as const,
      title: user.display_name || user.username || 'Unknown User',
      description: user.bio || '',
      imageUrl: user.avatar_url || '',
      visibility: 'public' as const, // Users themselves are always visible
      userId: user.id,
      username: user.username || '',
      displayName: user.display_name || '',
      privacyLevel: user.privacy_level as 'public' | 'private' | 'friends',
      relevanceScore: 1
    }))
  }, [supabase])

  // Search albums with privacy filtering - NEVER show private albums or drafts from other users
  const searchAlbums = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    // Check if we're doing a country search (either by country code or country name)
    const searchTerm = searchFilters.query.trim()
    const countryCode = searchParams.get('country') || getCountryCode(searchTerm)
    const isCountrySearch = !!countryCode

    let query = supabase
      .from('albums')
      .select(`
        id,
        title,
        description,
        created_at,
        date_start,
        location_name,
        country_code,
        latitude,
        longitude,
        cover_photo_url,
        visibility,
        status,
        user_id,
        users!inner(id, username, display_name)
      `)
      // CRITICAL: Filter out drafts - they should NEVER appear in search
      .neq('status', 'draft')

    // Text search - support title, description, location, country, and @username
    if (searchFilters.query) {
      const searchTerm = searchFilters.query.trim()

      // Check if searching for username with @ symbol
      if (searchTerm.startsWith('@')) {
        const username = searchTerm.substring(1)
        query = query.ilike('users.username', `%${username}%`)
      } else {
        // Try to get country code from country name (e.g., "Germany" -> "DE")
        const countryCode = getCountryCode(searchTerm)

        // Enhanced search: Search across title, description, location_name, country_code, and username
        // This allows "Germany" to match albums in Dortmund, Berlin, etc.
        if (countryCode) {
          // If we found a country code, search by country_code OR location containing the term
          // This catches both structured data (country_code) and location names like "Dortmund, Germany"
          query = query.or(`country_code.eq.${countryCode},location_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,users.username.ilike.%${searchTerm}%,users.display_name.ilike.%${searchTerm}%`)
        } else {
          // Regular search across all fields including country code
          // For specific cities like "Dortmund", this will match in location_name
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%,country_code.ilike.%${searchTerm}%,users.username.ilike.%${searchTerm}%,users.display_name.ilike.%${searchTerm}%`)
        }
      }
    }

    // Privacy/visibility filtering - CRITICAL: NEVER show private albums or drafts from other users
    if (user) {
      if (searchFilters.visibility === 'private') {
        // Only show user's own private albums
        query = query.eq('visibility', 'private').eq('user_id', user.id)
      } else if (searchFilters.visibility === 'all') {
        // Show: 1) All public albums 2) User's own albums (any visibility) 3) Friends albums if user follows them
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`)
      } else {
        // Public only - ONLY show public albums, exclude all private/friends/drafts
        query = query.eq('visibility', 'public')
      }
    } else {
      // Not logged in - ONLY show public albums, exclude ALL private/friends/drafts
      query = query.eq('visibility', 'public')
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

    // For country searches, limit to top 5 and fetch from this month
    const limit = isCountrySearch ? 5 : 50

    // Add date filter for country searches - get albums from this month
    if (isCountrySearch) {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      query = query.gte('created_at', firstDayOfMonth.toISOString())
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      log.error('Album search failed', { error, filters: searchFilters })
      throw error
    }

    // Fetch likes counts for albums
    const albumIds = (data || []).map(album => album.id)
    const likesCountMap = new Map<string, number>()

    if (albumIds.length > 0) {
      const { data: likesData } = await supabase
        .from('likes')
        .select('target_id')
        .eq('target_type', 'album')
        .in('target_id', albumIds)

      if (likesData) {
        likesData.forEach(like => {
          const currentCount = likesCountMap.get(like.target_id) || 0
          likesCountMap.set(like.target_id, currentCount + 1)
        })
      }
    }

    // Map results and add likes count
    let results = (data || []).map(album => {
      // Handle users relation - it can be an array or object depending on Supabase query
      const users = Array.isArray(album.users) ? album.users[0] : album.users
      const likesCount = likesCountMap.get(album.id) || 0
      return {
        id: album.id,
        type: 'album' as const,
        title: album.title,
        description: album.description || '',
        imageUrl: album.cover_photo_url || '',
        location: album.location_name || '',
        latitude: album.latitude,
        longitude: album.longitude,
        date: album.date_start || album.created_at,
        visibility: album.visibility as 'public' | 'private' | 'friends',
        userId: album.user_id,
        username: users?.username || users?.display_name || 'Unknown',
        relevanceScore: isCountrySearch ? likesCount : 1
      }
    })

    // Sort by likes for country searches
    if (isCountrySearch) {
      results = results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    }

    return results
  }, [supabase, user, searchParams])

  // Perform search - include both users and albums
  const performSearch = useCallback(async () => {
    setIsSearching(true)

    try {
      // Search both users and albums in parallel
      const [userResults, albumResults] = await Promise.all([
        searchUsers(filters),
        searchAlbums(filters)
      ])

      // Combine results with users first, then albums
      const combinedResults = [...userResults, ...albumResults]
      setResults(combinedResults)

      // Detect weather location from album results
      if (onWeatherLocationDetected && albumResults.length > 0) {
        // Find first album with lat/lng
        const albumWithLocation = albumResults.find(album =>
          album.latitude && album.longitude
        )

        if (albumWithLocation && albumWithLocation.latitude && albumWithLocation.longitude) {
          onWeatherLocationDetected(
            albumWithLocation.latitude,
            albumWithLocation.longitude,
            albumWithLocation.location || filters.query
          )
        }
      }
    } catch (error) {
      log.error('Search failed', { error, filters })
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [filters, searchUsers, searchAlbums, onWeatherLocationDetected])

  // Initial load and debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch()
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
      <div ref={resultsRef}>
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
    </div>
  )
}

interface SearchResultCardProps {
  result: SearchResult
  onSelect?: (result: SearchResult) => void
}

function SearchResultCard({ result }: SearchResultCardProps) {
  const getVisibilityIcon = () => {
    // For users, show their privacy level
    if (result.type === 'user') {
      switch (result.privacyLevel) {
        case 'public':
          return <GlobeIcon className="h-3 w-3" />
        case 'private':
          return <Lock className="h-3 w-3" />
        case 'friends':
          return <Users className="h-3 w-3" />
        default:
          return <GlobeIcon className="h-3 w-3" />
      }
    }

    // For albums, show album visibility
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
    const level = result.type === 'user' ? result.privacyLevel : result.visibility
    switch (level) {
      case 'public':
        return 'bg-green-100 text-green-700'
      case 'private':
        return 'bg-gray-100 text-gray-700'
      case 'friends':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-green-100 text-green-700'
    }
  }

  const getVisibilityLabel = () => {
    if (result.type === 'user') {
      return result.privacyLevel || 'public'
    }
    return result.visibility
  }

  const linkHref = result.type === 'user' ? `/profile/${result.userId}` : `/albums/${result.id}`

  return (
    <Link href={linkHref}>
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
                <span className="capitalize text-xs">{getVisibilityLabel()}</span>
              </Badge>
              {result.type === 'user' && (
                <Badge className="bg-purple-100 text-purple-700">
                  <Users className="h-3 w-3 mr-1" />
                  User
                </Badge>
              )}
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
                {result.type === 'user' ? (
                  <span className="font-medium">@{result.username}</span>
                ) : (
                  <span>@{result.username}</span>
                )}
              </div>
              {result.type === 'album' && result.date && (
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
