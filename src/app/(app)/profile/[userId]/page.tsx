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
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { User, Album } from '@/types/database'
import { useFollows } from '@/lib/hooks/useFollows'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import dynamic from 'next/dynamic'

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
  const [activeTab, setActiveTab] = useState('globe')

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

        // Fetch user profile by UUID or username
        let userData: User | null = null
        let userError: { code?: string; message?: string } | null = null

        if (isUUID) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userIdOrUsername)
            .single()
          userData = data
          userError = error
        } else {
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

        // Check if account is private and if current user follows them
        const userIsPrivate = userData.is_private || userData.privacy_level === 'private'
        if (userIsPrivate && currentUser?.id !== userData.id) {
          try {
            const status = await getFollowStatus(userData.id)
            setFollowStatus(status)

            if (status !== 'following') {
              setIsPrivate(true)
              setLoading(false)
              return
            }
          } catch (err) {
            log.error('Error checking follow status', { component: 'ProfilePage', userId: userData.id }, err instanceof Error ? err : new Error(String(err)))
            // Assume not following on error
            setFollowStatus('not_following')
            setIsPrivate(true)
            setLoading(false)
            return
          }
        } else if (!userIsPrivate) {
          // For public accounts, still check follow status for UI purposes
          try {
            const status = await getFollowStatus(userData.id)
            setFollowStatus(status)
          } catch (err) {
            // Non-critical error, just log it
            log.error('Error checking follow status for public account', { component: 'ProfilePage', userId: userData.id }, err instanceof Error ? err : new Error(String(err)))
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

  const handleFollowToggle = async () => {
    if (!profile) return

    try {
      setFollowLoading(true)

      if (followStatus === 'following') {
        await unfollowUser(profile.id)
        setFollowStatus('not_following')
      } else {
        await followUser(profile.id)
        setFollowStatus(profile.is_private ? 'pending' : 'following')
      }
    } catch (err) {
      log.error('Error toggling follow', { component: 'ProfilePage', userId: profile.id }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setFollowLoading(false)
    }
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
                  <Lock className="h-3 w-3" />
                  Private Account
                </Badge>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 text-center">
                    <Lock className="h-12 w-12 mx-auto text-blue-600 mb-3" />
                    <h3 className="font-semibold text-lg mb-2">This Account is Private</h3>
                    <p className="text-sm text-gray-700">
                      Follow this account to see their albums and travel map.
                    </p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Profile Card */}
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

              {profile.is_private && (
                <Badge variant="outline" className="gap-1 w-fit">
                  <Lock className="h-3 w-3" />
                  Private Account
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Globe and Albums Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="globe" className="gap-2">
            <GlobeIcon className="h-4 w-4" />
            Globe View
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-2">
            <Camera className="h-4 w-4" />
            Albums ({albums.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="globe" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="h-[600px] rounded-lg overflow-hidden">
                <EnhancedGlobe filterUserId={profile.id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="albums" className="mt-6">
          {albums.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Camera className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No public albums yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-shadow border-2 border-gray-100 hover:border-blue-300">
                    <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                      {album.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(album.cover_photo_url) || ''}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="font-medium text-sm truncate">{album.title}</p>
                        {album.location_name && (
                          <p className="text-xs opacity-90 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {album.location_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
