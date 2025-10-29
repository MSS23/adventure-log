'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/common/BackButton'
import {
  Camera,
  Lock,
  UserPlus,
  UserMinus,
  Loader2,
  MapPin,
  Users
} from 'lucide-react'
import { User, Album } from '@/types/database'
import { useFollows } from '@/lib/hooks/useFollows'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import dynamic from 'next/dynamic'
import { AlbumGrid } from '@/components/albums/AlbumGrid'
import { UserInfoCard } from '@/components/profile/UserInfoCard'
import { StatsCard } from '@/components/profile/StatsCard'
import { ProfileTabs, ProfileTab } from '@/components/profile/ProfileTabs'

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
  const [activeTab, setActiveTab] = useState<ProfileTab>('albums')
  const supabase = createClient()
  const { getFollowStatus, followUser, unfollowUser } = useFollows()
  const [followStatus, setFollowStatus] = useState<'not_following' | 'following' | 'pending' | 'blocked'>('not_following')
  const [followLoading, setFollowLoading] = useState(false)
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })

  const userIdOrUsername = Array.isArray(params.userId) ? params.userId[0] : params.userId

  // Calculate unique countries from albums
  const countriesCount = useMemo(() => {
    const uniqueCountryCodes = new Set(
      albums
        .filter(album => album.country_code)
        .map(album => album.country_code)
    )
    return uniqueCountryCodes.size
  }, [albums])

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
          // Generated username pattern - try to find user with matching username (case-insensitive)
          // This allows users to access their own profile before setting a custom username
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', userIdOrUsername)
            .maybeSingle()
          userData = data
          userError = error
        } else {
          // Regular username lookup (case-insensitive)
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', userIdOrUsername)
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
            country_code,
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

    // Refresh when page becomes visible (returning from album edit)
    const handleVisibilityChange = () => {
      if (!document.hidden && userIdOrUsername && currentUser) {
        fetchUserProfile()
      }
    }

    const handleFocus = () => {
      if (userIdOrUsername && currentUser) {
        fetchUserProfile()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
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
        <BackButton fallbackRoute="/feed" />
        <Card className="border-gray-200">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
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
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <BackButton fallbackRoute="/feed" />

        {/* Profile Card for Private Account */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src={getPhotoUrl(profile.avatar_url, 'avatars') || ''} alt={profile.display_name || profile.username || 'User'} />
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

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="max-w-7xl mx-auto p-6">
      <BackButton fallbackRoute="/feed" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
        {/* Left Sidebar - User Info and Stats */}
        <div className="space-y-4">
          {/* User Info Card */}
          <UserInfoCard
            profile={profile}
            isOwnProfile={isOwnProfile}
            followStatus={followStatus}
            followersCount={followStats.followersCount}
            followingCount={followStats.followingCount}
            onFollowClick={handleFollowToggle}
            followLoading={followLoading}
          />

          {/* Stats Cards */}
          <StatsCard
            label="Albums"
            value={albums.length}
          />

          <StatsCard
            label="Countries"
            value={countriesCount}
          />
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Tabs */}
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hideMap={albums.length === 0}
            hideSaved={!isOwnProfile}
          />

          {/* Tab Content */}
          {activeTab === 'albums' && (
            <div>
              <AlbumGrid
                albums={albums}
                columns={4}
                emptyMessage="No public albums yet"
              />
            </div>
          )}

          {activeTab === 'map' && (
            <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <EnhancedGlobe
                    filterUserId={profile.id}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'saved' && isOwnProfile && (
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">Saved albums feature coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
