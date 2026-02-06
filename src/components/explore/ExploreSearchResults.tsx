'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AlbumFavoriteButton } from '@/components/ui/favorite-button'

interface SearchResultAlbum {
  id: string
  title: string
  location_name?: string
  cover_photo_url?: string
  user_id: string
  users?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface SearchResultUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

interface ExploreSearchResultsProps {
  query: string
}

export function ExploreSearchResults({ query }: ExploreSearchResultsProps) {
  const [albums, setAlbums] = useState<SearchResultAlbum[]>([])
  const [users, setUsers] = useState<SearchResultUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const searchContent = async () => {
      if (!query.trim()) {
        setAlbums([])
        setUsers([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        // Strip @ prefix for username searches (like AdvancedSearch does)
        const trimmedQuery = query.trim()
        const usernameQuery = trimmedQuery.startsWith('@') ? trimmedQuery.substring(1) : trimmedQuery
        const searchTerm = `%${usernameQuery}%`

        // Search albums by title or location
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            location_name,
            cover_photo_url,
            user_id,
            users!albums_user_id_fkey(
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('visibility', 'public')
          .neq('status', 'draft')
          .or(`title.ilike.${searchTerm},location_name.ilike.${searchTerm}`)
          .limit(12)

        if (albumsError) throw albumsError

        // Search users by username or display name
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('privacy_level', 'public')
          .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .limit(8)

        if (usersError) throw usersError

        // Type assertion with proper handling of the users field
        const formattedAlbums: SearchResultAlbum[] = (albumsData || []).map((album: Record<string, unknown>) => ({
          id: album.id as string,
          title: album.title as string,
          location_name: (album.location_name as string | null) ?? undefined,
          cover_photo_url: (album.cover_photo_url as string | null) ?? undefined,
          user_id: album.user_id as string,
          users: (Array.isArray(album.users) ? album.users[0] : album.users) as SearchResultAlbum['users']
        }))

        setAlbums(formattedAlbums)
        setUsers((usersData || []) as SearchResultUser[])
      } catch (err) {
        console.error('Error searching:', err)
        setError('Failed to search. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(searchContent, 300)
    return () => clearTimeout(timeoutId)
  }, [query, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <MapPin className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Search failed</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  const hasResults = albums.length > 0 || users.length > 0

  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <MapPin className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600">
          Try searching for different keywords, locations, or usernames
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Users Results */}
      {users.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            People ({users.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all"
              >
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xl">
                    {user.display_name?.[0] || user.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-gray-900 text-sm text-center truncate w-full">
                  {user.display_name}
                </p>
                <p className="text-xs text-gray-500 truncate w-full text-center">
                  @{user.username}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Albums Results */}
      {albums.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Albums ({albums.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {albums.map((album) => {
              const albumUser = album.users
              return (
                <div
                  key={album.id}
                  className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all"
                >
                  <Link href={`/albums/${album.id}`} className="block">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {album.cover_photo_url ? (
                        <Image
                          src={album.cover_photo_url.startsWith('http') ? album.cover_photo_url : (getPhotoUrl(album.cover_photo_url) || '')}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/albums/${album.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">
                        {album.title}
                      </h3>
                    </Link>
                    {album.location_name && (
                      <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {album.location_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {albumUser && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={albumUser.avatar_url} />
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {albumUser.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">
                            by {albumUser.display_name}
                          </span>
                        </div>
                      )}
                      <AlbumFavoriteButton
                        targetId={album.id}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
