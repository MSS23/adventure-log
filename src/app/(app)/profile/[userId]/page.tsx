'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" /> }
)

type TabType = 'albums' | 'map'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, profile: currentUserProfile } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
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
          // Generated username pattern
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

        // Redirect to own profile if viewing own page
        if (currentUser?.id === userData.id) {
          router.push('/profile')
          return
        }

        // Check privacy level and follow status
        const privacyLevel = userData.privacy_level || (userData.is_private ? 'private' : 'public')

        // Always get follow status for non-own profiles
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

        // Fetch user's albums
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })

        if (albumsError) {
          log.error('Error fetching albums', {
            component: 'ProfilePage',
            userId: userData.id
          }, albumsError)
          throw albumsError
        }

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

    // Refresh when page becomes visible
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
  }, [userIdOrUsername, currentUser, supabase, getFollowStatus, router])

  // Fetch follow stats for the profile being viewed
  useEffect(() => {
    const fetchFollowStats = async () => {
      if (!profile?.id) return

      try {
        const [followersResult, followingResult] = await Promise.all([
          // Count followers
          supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('following_id', profile.id)
            .eq('status', 'accepted'),

          // Count following
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto p-6 pt-20">
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
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Show private account message
  if (isPrivate) {
    return (
      <div className="min-h-screen bg-white">
        {/* Private Profile Content */}
        <div className="max-w-4xl mx-auto p-6 pt-8">
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
                      className={
                        followStatus === 'following'
                          ? "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                          : "bg-teal-500 hover:bg-teal-600 text-white"
                      }
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar - Profile Info */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Avatar */}
              <div className="flex justify-center pt-6 pb-4">
                <Avatar className="h-24 w-24 ring-4 ring-gray-100">
                  <AvatarImage
                    src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                    alt={profile.display_name || profile.username || 'User'}
                  />
                  <AvatarFallback className="text-2xl bg-teal-500 text-white">
                    {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name & Username */}
              <div className="text-center px-4 pb-4">
                <h1 className="text-lg font-bold text-gray-900">
                  {profile.display_name || profile.username || 'Anonymous User'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  @{profile.username || 'anonymous'}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 text-center px-4 pb-4 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Follow Button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={
                    followStatus === 'following'
                      ? "w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                      : "w-full bg-teal-500 hover:bg-teal-600 text-white"
                  }
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : followStatus === 'following' ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {followStatus === 'following'
                    ? 'Unfollow'
                    : followStatus === 'pending'
                    ? 'Requested'
                    : 'Follow'}
                </Button>
              </div>

              {/* Following/Followers Stats */}
              <div className="grid grid-cols-2 gap-px bg-gray-200 border-y border-gray-200">
                <button className="bg-white py-3 text-center hover:bg-gray-50 transition-colors">
                  <div className="font-semibold text-gray-900">{followStats.followingCount}</div>
                  <div className="text-xs text-gray-500">Following</div>
                </button>
                <button className="bg-white py-3 text-center hover:bg-gray-50 transition-colors">
                  <div className="font-semibold text-gray-900">{followStats.followersCount}</div>
                  <div className="text-xs text-gray-500">Followers</div>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Albums</span>
                  <span className="text-lg font-bold text-gray-900">{albums.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Countries</span>
                  <span className="text-lg font-bold text-gray-900">{countriesCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Tabs and Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'albums'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Albums
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'map'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Map View
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'albums' && (
                <motion.div
                  key="albums"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.06,
                          delayChildren: 0.1
                        }
                      }
                    }}
                  >
                    {albums.length > 0 ? (
                      albums.map((album) => (
                        <motion.div
                          key={album.id}
                          variants={{
                            hidden: { opacity: 0, scale: 0.9 },
                            visible: {
                              opacity: 1,
                              scale: 1,
                              transition: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 24
                              }
                            }
                          }}
                        >
                          <Link
                            href={`/albums/${album.id}`}
                            className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 block shadow-sm"
                          >
                            <motion.div
                              className="w-full h-full"
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                              {album.cover_photo_url || album.cover_image_url ? (
                                <Image
                                  src={getPhotoUrl(album.cover_photo_url || album.cover_image_url) || ''}
                                  alt={album.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
                                  <Camera className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </motion.div>
                            {/* Album title overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white text-sm font-medium line-clamp-2">
                                  {album.title}
                                </p>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        className="col-span-full bg-white rounded-xl border border-gray-200 text-center py-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">No public albums yet</p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'map' && (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="w-full aspect-square max-h-[calc(100vh-220px)] bg-gradient-to-br from-slate-900 to-slate-800 relative">
                    <EnhancedGlobe filterUserId={profile.id} hideHeader={true} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}