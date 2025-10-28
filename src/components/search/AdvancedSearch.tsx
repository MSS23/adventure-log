'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import type { User } from '@/types/database'
import { FollowButton } from '@/components/social/FollowButton'
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
import { motion } from 'framer-motion'
import { log } from '@/lib/utils/logger'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import Link from 'next/link'
import { escapeHtml } from '@/lib/utils/html-escape'
import { getCountryCodeFromName } from '@/lib/utils/country-search'

interface SearchFilters {
  query: string
  dateRange: {
    from?: string
    to?: string
  }
  locations: string[]
  sortBy: 'relevance' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
  visibility: 'all' | 'public' | 'private' | 'friends'
  contentType: 'all' | 'albums' | 'travelers'
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
  visibility: 'public', // Show public albums by default, excluding private/draft
  contentType: 'all' // Show all content types by default
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
  const filtersRef = useRef(filters)
  const searchParamsRef = useRef(searchParams)

  // Keep filters ref in sync
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  // Keep searchParams ref in sync
  useEffect(() => {
    searchParamsRef.current = searchParams
  }, [searchParams])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsSearching(false)
      setResults([])
    }
  }, [])

  // Sync with URL search params and scroll to results when query changes
  useEffect(() => {
    const query = searchParams.get('q') || ''
    const countryParam = searchParams.get('country')
    const modeParam = searchParams.get('mode')
    const contentTypeParam = searchParams.get('contentType')
    const hadQuery = filters.query.length > 0

    // If we have a content type parameter, set it
    if (contentTypeParam && (contentTypeParam === 'albums' || contentTypeParam === 'travelers')) {
      setFilters(prev => ({ ...prev, contentType: contentTypeParam as 'albums' | 'travelers' }))
    }

    // If we have a country parameter, set it as the query
    if (countryParam) {
      setFilters(prev => ({ ...prev, query: countryParam }))
    } else if (query !== filters.query) {
      // Only update if the query has actually changed
      setFilters(prev => ({ ...prev, query }))
    }

    // Scroll to results when user starts typing (goes from empty to having text)
    if ((query || countryParam || modeParam === 'suggested') && !hadQuery && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams])

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

    // Filter out users with null username AND null display_name
    query = query.not('username', 'is', null)

    const { data, error } = await query.limit(20)

    if (error) {
      log.error('User search failed', { error, filters: searchFilters })
      return []
    }

    // Filter out invalid users and map to search results
    return (data || [])
      .filter(user => user.username || user.display_name) // Must have at least username or display name
      .map(user => ({
        id: user.id,
        type: 'user' as const,
        title: escapeHtml(user.display_name || user.username) || 'Unknown User',
        description: escapeHtml(user.bio) || '',
        imageUrl: user.avatar_url || '',
        visibility: 'public' as const, // Users themselves are always visible
        userId: user.id,
        username: escapeHtml(user.username) || '',
        displayName: escapeHtml(user.display_name) || '',
        privacyLevel: user.privacy_level as 'public' | 'private' | 'friends',
        relevanceScore: 1
      }))
  }, [supabase])

  // Search albums with privacy filtering - NEVER show private albums or drafts from other users
  const searchAlbums = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult[]> => {
    // Check if navigating from Countries tab (strict country filter)
    const countryUrlParam = searchParamsRef.current.get('country')
    const isCountryShowcase = !!countryUrlParam

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

    // If this is a Country Showcase (from Countries tab), apply STRICT filtering
    if (isCountryShowcase) {
      // STRICT: Only show albums from this exact country with photos
      query = query
        .eq('country_code', countryUrlParam)
        .not('cover_photo_url', 'is', null)
        .eq('visibility', 'public') // Only public albums for country showcases
    } else {
      // Regular search - more flexible
      // Only require photos if doing a text search
      if (searchFilters.query) {
        const searchTerm = searchFilters.query.trim()

        // Check if searching for username with @ symbol
        if (searchTerm.startsWith('@')) {
          const username = searchTerm.substring(1)
          query = query.ilike('users.username', `%${username}%`)
        } else {
          // Check if search term might be a country name
          const countryCode = getCountryCodeFromName(searchTerm)

          if (countryCode) {
            // If it's a country name, search by country code and location name
            query = query.or(`title.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%,country_code.eq.${countryCode}`)
          } else {
            // Regular search in title, location name, and country code
            query = query.or(`title.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%,country_code.ilike.%${searchTerm}%`)
          }
        }
      }
    }

    // Privacy/visibility filtering - CRITICAL: NEVER show private albums or drafts from other users
    // Skip this if already filtered by country showcase (which sets visibility to public)
    if (!isCountryShowcase) {
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

    // Sorting - order by created_at to get recent albums
    if (!isCountryShowcase) {
      query = query.order('created_at', { ascending: false })
    }

    // For country searches, limit to top 5 and fetch from this month
    const limit = isCountryShowcase ? 5 : 100

    // Add date filter for country searches - get albums with end date in current month
    if (isCountryShowcase) {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      query = query
        .gte('date_end', firstDayOfMonth.toISOString())
        .lte('date_end', lastDayOfMonth.toISOString())
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      log.error('Album search failed', { error, filters: searchFilters })
      return []
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
    // Filter out albums with missing users or no cover photos
    let results = (data || [])
      .filter(album => {
        // Must have user data
        const users = Array.isArray(album.users) ? album.users[0] : album.users
        if (!users) return false

        // Must have cover photo
        if (!album.cover_photo_url) return false

        // Must have valid username
        if (!users.username && !users.display_name) return false

        return true
      })
      .map(album => {
        // Handle users relation - it can be an array or object depending on Supabase query
        const users = Array.isArray(album.users) ? album.users[0] : album.users
        const likesCount = likesCountMap.get(album.id) || 0
        return {
          id: album.id,
          type: 'album' as const,
          title: escapeHtml(album.title) || 'Untitled',
          description: escapeHtml(album.description) || '',
          imageUrl: album.cover_photo_url || '',
          location: escapeHtml(album.location_name) || '',
          latitude: album.latitude,
          longitude: album.longitude,
          date: album.date_start || album.created_at,
          visibility: album.visibility as 'public' | 'private' | 'friends',
          userId: album.user_id,
          username: escapeHtml(users?.username || users?.display_name) || 'Unknown',
          relevanceScore: likesCount
        }
      })

    // Sort ALL results by popularity (likes count) - most popular first
    results = results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return results
  }, [supabase, user])

  // Perform search - include both users and albums
  const performSearch = useCallback(async () => {
    setIsSearching(true)
    const currentFilters = filtersRef.current
    const modeParam = searchParamsRef.current.get('mode')

    try {
      // Special handling for "suggested" mode - show suggested users
      if (modeParam === 'suggested') {
        // Get suggested users similar to SuggestedUsers component logic
        const { data: userData } = await supabase.auth.getUser()
        const currentUserId = userData?.user?.id

        if (!currentUserId) {
          // If not logged in, show popular users
          const { data: popularUsers } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio, privacy_level')
            .eq('privacy_level', 'public')
            .not('avatar_url', 'is', null)
            .limit(20)
            .order('created_at', { ascending: false })

          const userResults: SearchResult[] = (popularUsers || []).map(user => ({
            id: user.id,
            type: 'user' as const,
            title: escapeHtml(user.display_name || user.username) || 'Unknown User',
            description: escapeHtml(user.bio) || '',
            imageUrl: user.avatar_url || '',
            visibility: 'public' as const,
            userId: user.id,
            username: escapeHtml(user.username) || '',
            displayName: escapeHtml(user.display_name) || '',
            privacyLevel: user.privacy_level as 'public' | 'private' | 'friends',
            relevanceScore: 1
          }))

          setResults(userResults)
          setIsSearching(false)
          return
        }

        // Get users currently following
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .eq('status', 'accepted')

        const followingIds = followingData?.map(f => f.following_id) || []

        // Get current user's visited countries
        const { data: myAlbums } = await supabase
          .from('albums')
          .select('country_code')
          .eq('user_id', currentUserId)
          .not('country_code', 'is', null)

        const myCountries = myAlbums
          ? [...new Set(myAlbums.map(a => a.country_code).filter(Boolean))]
          : []

        let suggestedUsers: User[] = []

        // Find users who visited similar countries
        if (myCountries.length > 0) {
          const { data: locationMatches } = await supabase
            .from('albums')
            .select(`
              user_id,
              users!albums_user_id_fkey(id, username, display_name, avatar_url, bio, privacy_level)
            `)
            .in('country_code', myCountries)
            .neq('user_id', currentUserId)
            .limit(50)

          const userMap = new Map<string, User>()
          locationMatches?.forEach(album => {
            const albumWithUser = album as unknown as { user_id: string; users: User | null }
            const user = albumWithUser.users
            if (user && user.privacy_level === 'public' && !followingIds.includes(user.id)) {
              userMap.set(user.id, user)
            }
          })
          suggestedUsers = Array.from(userMap.values())
        }

        // Add friends of friends if we need more
        if (suggestedUsers.length < 20 && followingIds.length > 0) {
          const { data: fofData } = await supabase
            .from('follows')
            .select(`
              following_id,
              users!follows_following_id_fkey(id, username, display_name, avatar_url, bio, privacy_level)
            `)
            .in('follower_id', followingIds)
            .eq('status', 'accepted')
            .neq('following_id', currentUserId)
            .limit(30)

          fofData?.forEach(follow => {
            const followWithUser = follow as unknown as { following_id: string; users: User | null }
            const user = followWithUser.users
            if (user && user.privacy_level === 'public' && !followingIds.includes(user.id)) {
              if (!suggestedUsers.find(u => u.id === user.id)) {
                suggestedUsers.push(user)
              }
            }
          })
        }

        // Add some popular users if still need more
        if (suggestedUsers.length < 10) {
          const { data: popularUsers } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio, privacy_level')
            .eq('privacy_level', 'public')
            .neq('id', currentUserId)
            .not('avatar_url', 'is', null)
            .limit(20)
            .order('created_at', { ascending: false })

          popularUsers?.forEach(user => {
            if (!followingIds.includes(user.id) && !suggestedUsers.find(u => u.id === user.id)) {
              suggestedUsers.push(user as unknown as User)
            }
          })
        }

        const userResults: SearchResult[] = suggestedUsers.slice(0, 20).map(user => ({
          id: user.id,
          type: 'user' as const,
          title: escapeHtml(user.display_name || user.username) || 'Unknown User',
          description: escapeHtml(user.bio) || 'Suggested for you',
          imageUrl: user.avatar_url || '',
          visibility: 'public' as const,
          userId: user.id,
          username: escapeHtml(user.username) || '',
          displayName: escapeHtml(user.display_name) || '',
          privacyLevel: user.privacy_level as 'public' | 'private' | 'friends',
          relevanceScore: 1
        }))

        setResults(userResults)
        setIsSearching(false)
        return
      }

      // If no query, show popular albums and most followed travelers
      if (!currentFilters.query.trim()) {
        const [popularAlbums, topTravelers] = await Promise.all([
          // Get popular albums (with most likes)
          supabase
            .from('albums')
            .select(`
              id, title, description, cover_photo_url, location_name,
              latitude, longitude, created_at, visibility, user_id,
              users!inner(id, username, display_name)
            `)
            .eq('visibility', 'public')
            .not('cover_photo_url', 'is', null)
            .neq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(6),

          // Get most followed users
          supabase.rpc('get_most_followed_users', { limit_count: 6 })
            .then(({ data, error }) => {
              if (error || !data) {
                // Fallback: get recent users
                return supabase
                  .from('users')
                  .select('id, username, display_name, avatar_url, bio, privacy_level')
                  .eq('privacy_level', 'public')
                  .neq('id', user?.id || '')
                  .limit(6)
                  .then(({ data }) => ({ data }))
              }
              return { data }
            })
        ])

        const albumResults: SearchResult[] = (popularAlbums.data || []).map(album => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const users = (album as any).users
          return {
            id: album.id,
            type: 'album' as const,
            title: escapeHtml(album.title) || 'Untitled',
            description: escapeHtml(album.description) || '',
            imageUrl: album.cover_photo_url || '',
            location: escapeHtml(album.location_name) || '',
            latitude: album.latitude,
            longitude: album.longitude,
            date: album.created_at,
            visibility: album.visibility as 'public',
            userId: album.user_id,
            username: escapeHtml(users?.username) || '',
            relevanceScore: 1
          }
        })

        interface TravelerData {
          id: string
          username: string
          display_name?: string
          avatar_url?: string
          bio?: string
          privacy_level: string
          followers_count?: number
        }

        const userResults: SearchResult[] = (topTravelers.data || []).map(
        (traveler: TravelerData) => ({
          id: traveler.id,
          type: 'user' as const,
          title: escapeHtml(traveler.display_name || traveler.username) || 'Unknown User',
          description: escapeHtml(traveler.bio) || 'Explore their adventures',
          imageUrl: traveler.avatar_url || '',
          visibility: 'public' as const,
          userId: traveler.id,
          username: escapeHtml(traveler.username) || '',
          displayName: escapeHtml(traveler.display_name) || '',
          privacyLevel: traveler.privacy_level as 'public' | 'private' | 'friends',
          relevanceScore: traveler.followers_count || 1
        }))

        // Mix popular albums and top travelers
        const combined = [...albumResults, ...userResults]
        setResults(combined)
        setIsSearching(false)
        return
      }

      // Search both users and albums in parallel based on content type filter
      let userResults: SearchResult[] = []
      let albumResults: SearchResult[] = []

      if (currentFilters.contentType === 'all' || currentFilters.contentType === 'travelers') {
        userResults = await searchUsers(currentFilters)
      }

      if (currentFilters.contentType === 'all' || currentFilters.contentType === 'albums') {
        albumResults = await searchAlbums(currentFilters)
      }

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
            albumWithLocation.location || currentFilters.query
          )
        }
      }
    } catch (error) {
      log.error('Search failed', { error, filters: currentFilters })
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchUsers, searchAlbums, onWeatherLocationDetected, supabase, user])

  // Initial load and debounced search
  useEffect(() => {
    // Only search if we have a query or if we're in a country search view or suggested mode
    const countryParam = searchParams.get('country')
    const modeParam = searchParams.get('mode')
    if (!filters.query && !countryParam && modeParam !== 'suggested') {
      setIsSearching(false)
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch()
    }, filters.query ? 300 : 0) // Immediate load without query, debounced with query

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.visibility, filters.sortBy, JSON.stringify(filters.dateRange), JSON.stringify(filters.locations), searchParams])

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
      {/* Search Input */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search adventures, places, travelers..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-11 pr-10 h-12 text-base"
            />
            {filters.query && (
              <button
                onClick={() => updateFilter('query', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Content Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Content Type</label>
              <Select
                value={filters.contentType}
                onValueChange={(value) => updateFilter('contentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>All</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="albums">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      <span>Albums</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="travelers">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Travelers</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Relevance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date-desc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Newest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date-asc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Oldest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visibility Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Visibility</label>
              <Select
                value={filters.visibility}
                onValueChange={(value) => updateFilter('visibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>All</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Friends</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateRange.from || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateRange.to || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.dateRange.from || filters.dateRange.to || filters.locations.length > 0 || filters.visibility !== 'public' || filters.sortBy !== 'relevance') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Active filters:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    From: {new Date(filters.dateRange.from).toLocaleDateString()}
                    <button
                      onClick={() => updateFilter('dateRange', { ...filters.dateRange, from: undefined })}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.dateRange.to && (
                  <Badge variant="secondary" className="gap-1">
                    To: {new Date(filters.dateRange.to).toLocaleDateString()}
                    <button
                      onClick={() => updateFilter('dateRange', { ...filters.dateRange, to: undefined })}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.locations.map(location => (
                  <Badge key={location} variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                    <button
                      onClick={() => removeLocationFilter(location)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filters.visibility !== 'public' && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    {filters.visibility === 'all' ? <Sparkles className="h-3 w-3" /> :
                     filters.visibility === 'private' ? <Lock className="h-3 w-3" /> :
                     <Users className="h-3 w-3" />}
                    {filters.visibility}
                  </Badge>
                )}
                {filters.sortBy !== 'relevance' && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    Sort: {filters.sortBy.replace('-', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary - Simplified */}
      {results.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}


      {/* Search Results */}
      <div ref={resultsRef}>
      {/* Results Heading */}
      {!isSearching && results.length > 0 && !filters.query && (
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Discover Adventures</h2>
          <p className="text-gray-600">Explore popular albums and connect with top travelers</p>
        </div>
      )}

      {isSearching ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{filters.query ? 'Searching...' : 'Loading travelers...'}</p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-gray-500">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filters.query ? 'No results found' : 'No travelers found'}
              </p>
              <p className="text-sm">
                {filters.query
                  ? 'Try adjusting your search terms or filters'
                  : 'Start searching to discover adventures and travelers'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {!filters.query && results.length > 0 ? (
            // Show categorized results when no search query (Discover mode)
            <div className="space-y-8">
              {/* Popular Albums Section */}
              {results.filter(r => r.type === 'album').length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">
                    🌍 Popular Albums
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.filter(r => r.type === 'album').map((result) => (
                      <SearchResultCard
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onSelect={onResultSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Travelers Section */}
              {results.filter(r => r.type === 'user').length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">
                    👥 Top Travelers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.filter(r => r.type === 'user').map((result) => (
                      <SearchResultCard
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onSelect={onResultSelect}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular search results (mixed)
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
        </>
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
  const { user } = useAuth()
  const isOwnContent = user?.id === result.userId
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="overflow-hidden border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
        <Link href={linkHref} className="block">
          {/* Cover Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden cursor-pointer">
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
        </Link>

        {/* Follow Button for Users - Outside Link to allow clicking */}
        {result.type === 'user' && !isOwnContent && (
          <CardContent className="pt-0 pb-4 px-4">
            <FollowButton
              userId={result.userId}
              size="sm"
              showText={true}
              className="w-full"
            />
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}
