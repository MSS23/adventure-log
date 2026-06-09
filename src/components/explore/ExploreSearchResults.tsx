'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlbumFavoriteButton } from '@/components/ui/favorite-button'
import { log } from '@/lib/utils/logger'

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
        log.error('Error searching', { component: 'ExploreSearchResults', action: 'search' }, err as Error)
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
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-forest)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[color:var(--color-coral-tint)]">
          <MapPin className="h-8 w-8" style={{ color: 'var(--color-coral)' }} />
        </div>
        <h3 className="font-heading text-lg font-semibold text-[color:var(--color-ink)] mb-2">Search failed</h3>
        <p className="text-[color:var(--color-ink-soft)]">{error}</p>
      </div>
    )
  }

  const hasResults = albums.length > 0 || users.length > 0

  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[color:var(--color-forest-tint)]">
          <MapPin className="h-8 w-8" style={{ color: 'var(--color-forest)' }} />
        </div>
        <h3 className="font-heading text-lg font-semibold text-[color:var(--color-ink)] mb-2">No results found</h3>
        <p className="text-[color:var(--color-ink-soft)]">
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
          <p className="al-eyebrow mb-1">People</p>
          <h2 className="font-heading text-xl font-semibold text-[color:var(--color-ink)] mb-4" style={{ letterSpacing: '-0.02em' }}>
            {users.length} {users.length === 1 ? 'person' : 'people'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="group flex flex-col items-center p-4 rounded-2xl border border-[color:var(--color-line-warm)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(26,20,14,0.25)] transition-all"
                style={{ background: 'var(--card)' }}
              >
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xl font-bold" style={{ background: 'var(--color-forest-tint)', color: 'var(--color-forest)' }}>
                    {user.display_name?.[0] || user.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-heading font-semibold text-[color:var(--color-ink)] group-hover:text-[color:var(--color-forest)] transition-colors text-sm text-center truncate w-full">
                  {user.display_name}
                </p>
                <p className="font-mono text-[11px] tracking-[0.04em] text-[color:var(--color-muted-warm)] truncate w-full text-center">
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
          <p className="al-eyebrow mb-1">Albums</p>
          <h2 className="font-heading text-xl font-semibold text-[color:var(--color-ink)] mb-4" style={{ letterSpacing: '-0.02em' }}>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {albums.map((album) => {
              const albumUser = album.users
              return (
                <div
                  key={album.id}
                  className="group rounded-2xl overflow-hidden border border-[color:var(--color-line-warm)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(26,20,14,0.25)] transition-all"
                  style={{ background: 'var(--card)' }}
                >
                  <Link href={`/albums/${album.id}`} className="block">
                    <div className="relative aspect-[4/3]" style={{ background: 'var(--color-ivory-alt)' }}>
                      {album.cover_photo_url ? (
                        <>
                          <Image
                            src={album.cover_photo_url.startsWith('http') ? album.cover_photo_url : (getPhotoUrl(album.cover_photo_url) || '')}
                            alt={album.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-forest-tint)' }}>
                          <MapPin className="h-12 w-12" style={{ color: 'var(--color-forest-soft)' }} />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/albums/${album.id}`}>
                      <h3 className="font-heading font-semibold text-[color:var(--color-ink)] mb-1 group-hover:text-[color:var(--color-forest)] transition-colors line-clamp-1">
                        {album.title}
                      </h3>
                    </Link>
                    {album.location_name && (
                      <p className="text-sm text-[color:var(--color-muted-warm)] mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {album.location_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {albumUser && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={albumUser.avatar_url} />
                            <AvatarFallback className="text-xs font-bold" style={{ background: 'var(--color-forest-tint)', color: 'var(--color-forest)' }}>
                              {albumUser.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-[color:var(--color-ink-soft)]">
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
