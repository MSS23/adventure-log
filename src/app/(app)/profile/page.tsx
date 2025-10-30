'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bell,
  Loader2,
  Camera,
  Home,
  Compass,
  Plus
} from 'lucide-react'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" /> }
)

type TabType = 'albums' | 'map' | 'saved'

export default function ProfilePage() {
  const router = useRouter()
  const { user: currentUser, profile } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const supabase = createClient()

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
    const fetchUserData = async () => {
      if (!currentUser || !profile) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Fetch user's albums
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (albumsError) {
          log.error('Error fetching albums', {
            component: 'ProfilePage',
            userId: currentUser.id
          }, albumsError)
          throw albumsError
        }

        setAlbums(albumsData || [])

        // Fetch follow stats
        const [followersResult, followingResult] = await Promise.all([
          supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('following_id', currentUser.id)
            .eq('status', 'accepted'),
          supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('follower_id', currentUser.id)
            .eq('status', 'accepted')
        ])

        setFollowStats({
          followersCount: followersResult.count || 0,
          followingCount: followingResult.count || 0
        })
      } catch (err) {
        log.error('Error fetching user data', {
          component: 'ProfilePage'
        }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser) {
        fetchUserData()
      }
    }

    const handleFocus = () => {
      if (currentUser) {
        fetchUserData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUser, profile, supabase])

  if (!currentUser || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Navigation Links */}
            <nav className="flex items-center gap-8">
              <Link href="/feed" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link href="/explore" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
                <Compass className="h-5 w-5" />
                <span className="hidden sm:inline">Explore</span>
              </Link>
              <Link href="/albums/new" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Create</span>
              </Link>
            </nav>

            {/* Right side - Notification & Avatar */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="h-5 w-5 text-gray-700" />
              </button>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage
                  src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                  alt={profile.display_name || profile.username || 'User'}
                />
                <AvatarFallback className="text-sm bg-teal-500 text-white">
                  {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-lg">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <Avatar className="h-32 w-32 ring-4 ring-gray-100">
                  <AvatarImage
                    src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                    alt={profile.display_name || profile.username || 'User'}
                  />
                  <AvatarFallback className="text-3xl bg-teal-500 text-white">
                    {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name & Username */}
              <div className="text-center mb-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {profile.display_name || profile.username || 'Anonymous User'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  @{profile.username || 'anonymous'}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 text-center mb-4 px-4">
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Button */}
              <div className="px-4 mb-4">
                <Link href="/settings" className="block">
                  <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium">
                    Edit Profile
                  </Button>
                </Link>
              </div>

              {/* Following/Followers Stats */}
              <div className="flex justify-center gap-8 py-4 border-t border-gray-100">
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="font-semibold text-gray-900">{followStats.followingCount}</div>
                  <div className="text-xs text-gray-500">Following</div>
                </button>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="font-semibold text-gray-900">{followStats.followersCount}</div>
                  <div className="text-xs text-gray-500">Followers</div>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Albums</span>
                  <span className="text-xl font-semibold text-gray-900">{albums.length}</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Countries</span>
                  <span className="text-xl font-semibold text-gray-900">{countriesCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Tabs and Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === 'albums'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Albums
                  {activeTab === 'albums' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === 'map'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Map View
                  {activeTab === 'map' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === 'saved'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Saved
                  {activeTab === 'saved' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.length > 0 ? (
                  albums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/albums/${album.id}`}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
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
                      {/* Album title overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="text-white text-sm font-medium line-clamp-1">
                          {album.title}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No albums yet</p>
                    <Link href="/albums/new">
                      <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">
                        Create Your First Album
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="h-[75vh] min-h-[600px] max-h-[900px] bg-gradient-to-br from-slate-900 to-slate-800">
                  <EnhancedGlobe filterUserId={currentUser.id} hideHeader={true} />
                </div>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="text-center py-12">
                <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Saved albums feature coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}