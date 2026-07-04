'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Album, User } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import Image from 'next/image'
import { log } from '@/lib/utils/logger'
import { sanitizeText } from '@/lib/utils/input-validation'
import { PUBLIC_USER_COLUMNS } from '@/lib/constants/user-columns'

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
    const sanitized = sanitizeText(searchQuery).trim()
    if (!sanitized) {
      setResults([])
      setIsSearching(false)
      return
    }

    // Limit query length to prevent abuse
    const safeQuery = sanitized.slice(0, 100)

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
        .or(`title.ilike.%${safeQuery}%,location_name.ilike.%${safeQuery}%`)
        .eq('visibility', 'public')
        .neq('status', 'draft')
        .limit(5)

      if (albumsError) {
        log.error('Error searching albums', {
          component: 'SearchBar',
          action: 'performSearch'
        }, albumsError)
      }

      // Search users by username or display name.
      // Explicit safe columns — select('*') is permission-denied once
      // migration 76 locks down the users PII columns.
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(PUBLIC_USER_COLUMNS)
        .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
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
        ...(users || []).map(user => ({ type: 'user' as const, data: user as unknown as User }))
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
    <div ref={searchRef} className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base rounded-xl"
          onFocus={() => query && setShowResults(true)}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-card rounded-2xl shadow-md border border-border overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => {
                if (result.type === 'album') {
                  const album = result.data as Album
                  // Type assertion for Supabase join
                  const albumWithUser = album as Album & { users?: { username?: string; display_name?: string } }
                  const user = album.user || albumWithUser.users
                  const coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)

                  return (
                    <Link
                      key={`album-${album.id}`}
                      href={`/albums/${album.id}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/60 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Search className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {album.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {album.location_name || 'Unknown location'}
                        </p>
                        {user && (
                          <p className="text-xs text-muted-foreground truncate">
                            by {getDisplayName(user.display_name, user.username)}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Album
                      </span>
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
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/60 transition-colors"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                          {getDisplayInitial(user.display_name, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {getDisplayName(user.display_name, user.username)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.bio}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        User
                      </span>
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
