'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Album, User } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

interface SearchBarProps {
  placeholder?: string
  className?: string
}

interface SearchResult {
  type: 'album' | 'user'
  data: Album | User
}

export function SearchBar({
  placeholder = "Search locations, users, or keywords...",
  className
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const supabase = createClient()

    try {
      // Search albums by title or location
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select(`
          *,
          users!albums_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`title.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`)
        .eq('privacy', 'public')
        .limit(5)

      if (albumsError) {
        log.error('Error searching albums', {
          component: 'SearchBar',
          action: 'performSearch'
        }, albumsError)
      }

      // Search users by username or display name
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq('privacy_level', 'public')
        .limit(5)

      if (usersError) {
        log.error('Error searching users', {
          component: 'SearchBar',
          action: 'performSearch'
        }, usersError)
      }

      // Combine results
      const combinedResults: SearchResult[] = [
        ...(albums || []).map(album => ({ type: 'album' as const, data: album })),
        ...(users || []).map(user => ({ type: 'user' as const, data: user }))
      ]

      setResults(combinedResults)
      setShowResults(true)
    } catch (error) {
      log.error('Error performing search', {
        component: 'SearchBar',
        action: 'performSearch'
      }, error as Error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced search (300ms delay)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  const handleResultClick = () => {
    setShowResults(false)
    setQuery('')
  }

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-12 pr-10 h-12 text-base rounded-full border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
          onFocus={() => query && setShowResults(true)}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-6 text-center text-gray-500">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => {
                if (result.type === 'album') {
                  const album = result.data as Album
                  const user = album.user || (album as any).users
                  const coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)

                  return (
                    <Link
                      key={`album-${album.id}`}
                      href={`/albums/${album.id}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={album.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Search className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {album.title}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {album.location_name || 'Unknown location'}
                        </p>
                        {user && (
                          <p className="text-xs text-gray-500 truncate">
                            by {user.display_name || user.username}
                          </p>
                        )}
                      </div>
                      <div className="px-2 py-1 text-xs font-medium text-teal-600 bg-teal-50 rounded">
                        Album
                      </div>
                    </Link>
                  )
                }

                if (result.type === 'user') {
                  const user = result.data as User

                  return (
                    <Link
                      key={`user-${user.id}`}
                      href={`/profile/${user.username}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-lg font-semibold">
                          {(user.display_name || user.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {user.bio}
                          </p>
                        )}
                      </div>
                      <div className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded">
                        User
                      </div>
                    </Link>
                  )
                }

                return null
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
