'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Camera,
  Globe as GlobeIcon,
  Lock,
  UserPlus,
  UserMinus,
  Loader2,
  MapPin,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { User, Album } from '@/types/database'
import { useFollows } from '@/lib/hooks/useFollows'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" /> }
)

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const supabase = createClient()
  const { getFollowStatus, followUser, unfollowUser } = useFollows()
  const [followStatus, setFollowStatus] = useState<'not_following' | 'following' | 'pending' | 'blocked'>('not_following')
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [selectedAlbumCoords, setSelectedAlbumCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [globeKey, setGlobeKey] = useState(0)

  const userIdOrUsername = Array.isArray(params.userId) ? params.userId[0] : params.userId

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Validate userIdOrUsername exists
        if (!userIdOrUsername) {
          setError('Invalid user identifier')
          setLoading(false)
          return
        }

        // Check if it's a UUID or username
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername)

        // Check if it's a generated username pattern (user_XXXXXXXX)
        const generatedUsernameMatch = userIdOrUsername.match(/^user_([0-9a-f]{8})$/i)

        // Fetch user profile by UUID or username
        let userData: User | null = null
        let userError: { code?: string; message?: string } | null = null

        if (isUUID) {
          // Direct UUID lookup
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userIdOrUsername)
            .single()
          userData = data
          userError = error
        } else if (generatedUsernameMatch) {
          // Generated username pattern - try to find user with matching username
          // This allows users to access their own profile before setting a custom username
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', userIdOrUsername)
            .maybeSingle()
          userData = data
          userError = error
        } else {
          // Regular username lookup
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', userIdOrUsername)
            .maybeSingle()
          userData = data
          userError = error
        }

        if (userError) {
          if (userError.code === 'PGRST116') {
            throw new Error('User not found')
          }
          throw new Error(userError.message || 'Failed to fetch user')
        }

        if (!userData) {
          throw new Error('User not found')
        }

        setProfile(userData)

        // Check privacy level and follow status
        const privacyLevel = userData.privacy_level || (userData.is_private ? 'private' : 'public')
        const isViewingOwnProfile = currentUser?.id === userData.id

        // Always get follow status for non-own profiles
        if (!isViewingOwnProfile) {
          try {
            const status = await getFollowStatus(userData.id)
            setFollowStatus(status)

            // Check if content should be hidden based on privacy level
            if (privacyLevel === 'private' && status !== 'following') {
              setIsPrivate(true)
              setLoading(false)
              return
            }

            if (privacyLevel === 'friends' && status !== 'following') {
              setIsPrivate(true)
              setLoading(false)
              return
            }
          } catch (err) {
            log.error('Error checking follow status', { component: 'ProfilePage', userId: userData.id }, err instanceof Error ? err : new Error(String(err)))
            // Assume not following on error for non-public accounts
            if (privacyLevel !== 'public') {
              setFollowStatus('not_following')
              setIsPrivate(true)
              setLoading(false)
              return
            }
          }
        }

        // Fetch user's public albums (exclude drafts)
        // Include albums with visibility='public' OR visibility IS NULL (legacy albums)
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            description,
            cover_photo_url,
            location_name,
            latitude,
            longitude,
            date_start,
            created_at,
            updated_at,
            visibility,
            privacy,
            user_id
          `)
          .eq('user_id', userData.id)
          .or('visibility.eq.public,visibility.is.null')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(12)

        if (albumsError) throw albumsError

        setAlbums(albumsData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        log.error('Error fetching user profile', { component: 'ProfilePage', userId: userIdOrUsername }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    if (userIdOrUsername && currentUser) {
      fetchUserProfile()
    }
  }, [userIdOrUsername, currentUser, supabase, getFollowStatus])

  // Fetch follow stats for the profile being viewed
  useEffect(() => {
    const fetchFollowStats = async () => {
      if (!profile?.id) return

      try {
        const [followersResult, followingResult] = await Promise.all([
          // Count followers (people following this user with accepted status)
          supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('following_id', profile.id)
            .eq('status', 'accepted'),

          // Count following (people this user is following with accepted status)
          supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('follower_id', profile.id)
            .eq('status', 'accepted')
        ])

        setFollowStats({
          followersCount: followersResult.count || 0,
          followingCount: followingResult.count || 0
        })
      } catch (err) {
        log.error('Error fetching follow stats', { component: 'ProfilePage', userId: profile.id }, err instanceof Error ? err : new Error(String(err)))
      }
    }

    fetchFollowStats()
  }, [profile?.id, supabase])

  const handleFollowToggle = async () => {
    if (!profile) return

    try {
      setFollowLoading(true)

      if (followStatus === 'following') {
        await unfollowUser(profile.id)
        setFollowStatus('not_following')
      } else {
        await followUser(profile.id)

        // Determine new status based on privacy level
        const privacyLevel = profile.privacy_level || (profile.is_private ? 'private' : 'public')

        // Public accounts: auto-follow (status = 'following')
        // Private/Friends accounts: request to follow (status = 'pending')
        const newStatus = privacyLevel === 'public' ? 'following' : 'pending'
        setFollowStatus(newStatus)
      }

      // Refresh follow stats after follow/unfollow
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', profile.id)
          .eq('status', 'accepted'),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', profile.id)
          .eq('status', 'accepted')
      ])

      setFollowStats({
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0
      })
    } catch (err) {
      log.error('Error toggling follow', { component: 'ProfilePage', userId: profile.id }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setFollowLoading(false)
    }
  }

  const handleAlbumClick = (albumId: string) => {
    // Find the album in the albums array
    const album = albums.find(a => a.id === albumId)

    if (!album || !album.latitude || !album.longitude) {
      log.warn('Album has no location data', {
        component: 'ProfilePage',
        action: 'album-click',
        albumId
      })
      return
    }

    // Set the selected album ID and coordinates
    setSelectedAlbumId(albumId)
    setSelectedAlbumCoords({
      lat: album.latitude,
      lng: album.longitude
    })

    // Force globe to re-render with new initial position by changing key
    setGlobeKey(prev => prev + 1)

    log.info('Album clicked for globe navigation', {
      component: 'ProfilePage',
      action: 'album-click',
      albumId,
      latitude: album.latitude,
      longitude: album.longitude
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto p-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-gray-200">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
              <Button onClick={() => router.push('/feed')}>
                Go to Feed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Redirect to own profile if viewing own page
  if (currentUser?.id === profile.id) {
    router.push('/profile')
    return null
  }

  // Show private account message
  if (isPrivate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Card for Private Account */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || profile.username || 'User'} />
                <AvatarFallback className="text-2xl">
                  {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.display_name || profile.username || 'Anonymous User'}</h1>
                  {profile.username && profile.username !== profile.display_name && (
                    <p className="text-gray-600 text-sm mt-1">@{profile.username}</p>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-gray-700">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={followStatus === 'following' ? 'outline' : 'default'}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : followStatus === 'following' ? (
                      <UserMinus className="h-4 w-4 mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {followStatus === 'following' ? 'Unfollow' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                  </Button>
                </div>

                <Badge variant="outline" className="gap-1 w-fit">
                  {profile.privacy_level === 'friends' ? (
                    <>
                      <Users className="h-3 w-3" />
                      Friends Only
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Private Account
                    </>
                  )}
                </Badge>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 text-center">
                    {profile.privacy_level === 'friends' ? (
                      <>
                        <Users className="h-12 w-12 mx-auto text-blue-600 mb-3" />
                        <h3 className="font-semibold text-lg mb-2">Friends Only Account</h3>
                        <p className="text-sm text-gray-700">
                          Follow this account and wait for approval to see their albums and travel map.
                        </p>
                      </>
                    ) : (
                      <>
                        <Lock className="h-12 w-12 mx-auto text-blue-600 mb-3" />
                        <h3 className="font-semibold text-lg mb-2">This Account is Private</h3>
                        <p className="text-sm text-gray-700">
                          Follow this account and wait for approval to see their albums and travel map.
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} size="sm">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Account Summary Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Profile Picture */}
            <Avatar className="h-20 w-20 md:h-24 md:w-24">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || profile.username || 'User'} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              {/* Name and Username */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profile.display_name || profile.username || 'Anonymous User'}
                </h1>
                {profile.username && profile.username !== profile.display_name && (
                  <p className="text-gray-500 text-sm mt-1">@{profile.username}</p>
                )}
              </div>

              {/* Follower/Following Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{albums.length}</span>
                  <span className="text-gray-600 ml-1">Albums</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{followStats.followersCount}</span>
                  <span className="text-gray-600 ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{followStats.followingCount}</span>
                  <span className="text-gray-600 ml-1">Following</span>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-gray-700 text-sm max-w-2xl">{profile.bio}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={followStatus === 'following' ? 'outline' : 'default'}
                  size="sm"
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : followStatus === 'following' ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {followStatus === 'following' ? 'Unfollow' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                </Button>
                {profile.is_private && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Globe Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Globe */}
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="h-[500px] rounded-lg overflow-hidden">
              <EnhancedGlobe
                key={globeKey}
                filterUserId={profile.id}
                initialAlbumId={selectedAlbumId || undefined}
                initialLat={selectedAlbumCoords?.lat}
                initialLng={selectedAlbumCoords?.lng}
              />
            </div>
          </CardContent>
        </Card>

        {/* Album Covers Sidebar */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Locations ({albums.filter(a => a.latitude && a.longitude).length})
            </h3>

            {albums.filter(a => a.latitude && a.longitude).length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-600">No albums with locations yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[436px] overflow-y-auto pr-2">
                {albums.filter(a => a.latitude && a.longitude).map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAlbumClick(album.id)}
                    className={cn(
                      "w-full text-left group relative rounded-lg overflow-hidden transition-all border-2",
                      selectedAlbumId === album.id
                        ? "border-blue-500 shadow-lg"
                        : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                    )}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {album.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(album.cover_photo_url) || ''}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 1024px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <p className="font-medium text-sm truncate">{album.title}</p>
                          {album.location_name && (
                            <p className="text-xs opacity-90 flex items-center gap-1 mt-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {album.location_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Albums Grid Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Albums ({albums.length})
          </h3>

          {albums.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">No public albums yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all border-2 border-gray-200 hover:border-blue-300">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="font-medium text-sm truncate">{album.title}</p>
                        {album.location_name && (
                          <p className="text-xs opacity-90 flex items-center gap-1 mt-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {album.location_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
