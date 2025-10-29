'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, UserPlus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Album, User } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from '@/components/layout/UserNav'
import { useAuth } from '@/components/auth/AuthProvider'
import { cn } from '@/lib/utils'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [albums, setAlbums] = useState<Album[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(query)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollows, setLoadingFollows] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  // Update search input when query param changes
  useEffect(() => {
    setSearchInput(query)
  }, [query])

  // Fetch current user's following list
  useEffect(() => {
    async function fetchFollowingList() {
      if (!user) return

      const supabase = createClient()
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (followsData) {
        setFollowingIds(new Set(followsData.map(f => f.following_id)))
      }
    }

    fetchFollowingList()
  }, [user])

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setAlbums([])
      setUsers([])
      return
    }

    async function performSearch() {
      setIsLoading(true)
      const supabase = createClient()

      try {
        // Search albums
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select(`
            *,
            users!albums_user_id_fkey(id, username, display_name, avatar_url),
            photos(id, file_path)
          `)
          .or(`title.ilike.%${query}%,location_name.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .limit(12)

        if (albumsError) {
          log.error('Error searching albums', {
            component: 'SearchPage',
            action: 'performSearch'
          }, albumsError)
        }

        // Search users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
          .eq('privacy_level', 'public')
          .neq('id', user?.id || '') // Exclude current user
          .order('created_at', { ascending: false })
          .limit(12)

        if (usersError) {
          log.error('Error searching users', {
            component: 'SearchPage',
            action: 'performSearch'
          }, usersError)
        }

        setAlbums(albumsData || [])
        setUsers(usersData || [])
      } catch (error) {
        log.error('Search error', {
          component: 'SearchPage',
          action: 'performSearch'
        }, error as Error)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [query, user])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  const handleClearSearch = () => {
    setSearchInput('')
    router.push('/search')
  }

  const handleFollowToggle = async (userId: string) => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    const supabase = createClient()
    const isFollowing = followingIds.has(userId)

    setLoadingFollows(prev => new Set(prev).add(userId))

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)

        if (error) {
          log.error('Error unfollowing user', {
            component: 'SearchPage',
            action: 'handleFollowToggle',
            userId
          }, error)
          return
        }

        setFollowingIds(prev => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
            status: 'approved'
          })

        if (error) {
          log.error('Error following user', {
            component: 'SearchPage',
            action: 'handleFollowToggle',
            userId
          }, error)
          return
        }

        setFollowingIds(prev => new Set(prev).add(userId))
      }
    } catch (err) {
      log.error('Error toggling follow', {
        component: 'SearchPage',
        action: 'handleFollowToggle',
        userId
      }, err as Error)
    } finally {
      setLoadingFollows(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Adventure Log</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm absolute left-1/2 -translate-x-1/2">
            <Link href="/feed" className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </Link>
            <Link href="/albums" className="text-gray-600 hover:text-gray-900 transition-colors">
              My Log
            </Link>
            <Link href="/explore" className="text-gray-600 hover:text-gray-900 transition-colors">
              Explore
            </Link>
          </nav>

          {/* User Avatar */}
          <UserNav />
        </div>
      </header>

      {/* Search Section */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-3xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search locations, users, or keywords..."
              className="pl-12 pr-10 h-14 text-base rounded-xl border-gray-300 bg-gray-50 hover:bg-white shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:bg-white transition-colors"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-gray-500">
              <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching...</span>
            </div>
          </div>
        ) : !query.trim() ? (
          // Default state - show helper text
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Search for Adventures
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Start typing to search for travel albums, places, or people to follow
            </p>
          </div>
        ) : albums.length === 0 && users.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No results found for &quot;{query}&quot;
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Try different keywords or browse our popular journeys
            </p>
            <Link href="/explore">
              <Button className="bg-teal-500 text-white hover:bg-teal-600">
                Explore Popular Journeys
              </Button>
            </Link>
          </div>
        ) : (
          // Results
          <div className="space-y-16">
            {/* Albums Results */}
            {albums.length > 0 && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Albums ({albums.length})
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Travel albums matching your search
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {albums.map((album) => {
                    const albumWithUser = album as Album & { users?: { username?: string; display_name?: string; avatar_url?: string } }
                    const albumUser = album.user || albumWithUser.users

                    let coverUrl: string | undefined
                    if (album.cover_photo_url || album.cover_image_url) {
                      coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)
                    } else if (album.photos && album.photos.length > 0) {
                      coverUrl = getPhotoUrl(album.photos[0].file_path)
                    }

                    return (
                      <div
                        key={album.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                      >
                        <Link href={`/albums/${album.id}`} className="block relative aspect-[16/9] overflow-hidden bg-gray-200">
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={album.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <MapPin className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </Link>

                        <div className="p-4 space-y-3">
                          <Link href={`/albums/${album.id}`}>
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1">
                              {album.title}
                            </h3>
                          </Link>

                          {album.location_name && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{album.location_name}</span>
                            </div>
                          )}

                          {albumUser && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <Link
                                href={`/profile/${albumUser.username}`}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={albumUser.avatar_url || undefined} alt={albumUser.display_name || albumUser.username} />
                                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
                                    {(albumUser.display_name || albumUser.username || 'U')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-600">
                                  by <span className="font-medium text-gray-900">{albumUser.display_name || albumUser.username}</span>
                                </span>
                              </Link>

                              <Link href={`/albums/${album.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium"
                                >
                                  View
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Users Results */}
            {users.length > 0 && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    People ({users.length})
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Travelers and adventurers matching your search
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {users.map((creator) => {
                    const isFollowing = followingIds.has(creator.id)
                    const isLoadingFollow = loadingFollows.has(creator.id)

                    return (
                      <div
                        key={creator.id}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <Link href={`/profile/${creator.username}`} className="block">
                            <Avatar className="h-24 w-24 border-2 border-gray-100 hover:border-teal-400 transition-colors">
                              <AvatarImage
                                src={creator.avatar_url || undefined}
                                alt={creator.display_name || creator.username}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-2xl font-bold">
                                {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="space-y-1 min-h-[60px] flex flex-col justify-start w-full">
                            <Link
                              href={`/profile/${creator.username}`}
                              className="font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1"
                            >
                              {creator.display_name || creator.username}
                            </Link>
                            {creator.bio ? (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {creator.bio}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                Adventure seeker
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => handleFollowToggle(creator.id)}
                            disabled={isLoadingFollow || !user}
                            className={cn(
                              "w-full font-medium rounded-lg transition-all duration-200",
                              isFollowing
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                : "bg-teal-500 text-white hover:bg-teal-600"
                            )}
                            size="sm"
                          >
                            {isLoadingFollow ? (
                              <span className="flex items-center gap-2">
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                {isFollowing ? 'Unfollowing...' : 'Following...'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                {isFollowing ? (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Following
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" />
                                    Follow
                                  </>
                                )}
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
