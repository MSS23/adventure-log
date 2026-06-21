'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <MapPin className="h-6 w-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Search failed</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const hasResults = albums.length > 0 || users.length > 0

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <MapPin className="h-6 w-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          No matches for &ldquo;{query.trim()}&rdquo;
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try a different place, person, or username — or check your spelling.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Users Results */}
      {users.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="al-eyebrow mb-0.5">People</p>
            <h2 className="al-display text-xl md:text-2xl">
              {users.length} {users.length === 1 ? 'person' : 'people'}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="group flex flex-col items-center rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={user.display_name || user.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {getDisplayInitial(user.display_name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-sm text-center truncate w-full">
                  {getDisplayName(user.display_name, user.username)}
                </p>
                <p className="font-mono text-[11px] tracking-wide text-muted-foreground truncate w-full text-center">
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
          <div className="mb-4">
            <p className="al-eyebrow mb-0.5">Albums</p>
            <h2 className="al-display text-xl md:text-2xl">
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {albums.map((album) => {
              const albumUser = album.users
              return (
                <div
                  key={album.id}
                  className="group rounded-2xl overflow-hidden border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  <Link href={`/albums/${album.id}`} className="block">
                    <div className="relative aspect-[4/3] bg-muted">
                      {album.cover_photo_url ? (
                        <>
                          <Image
                            src={album.cover_photo_url.startsWith('http') ? album.cover_photo_url : (getPhotoUrl(album.cover_photo_url) || '')}
                            alt={album.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <MapPin className="h-12 w-12 text-primary" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/albums/${album.id}`}>
                      <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {album.title}
                      </h3>
                    </Link>
                    {album.location_name && (
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {album.location_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {albumUser && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={getAvatarUrl(albumUser.avatar_url, albumUser.username)} alt={albumUser.display_name || albumUser.username} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {getDisplayInitial(albumUser.display_name, albumUser.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            by {getDisplayName(albumUser.display_name, albumUser.username)}
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
