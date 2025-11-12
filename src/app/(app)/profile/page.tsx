'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Loader2,
  Camera
} from 'lucide-react'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { UserPlus } from 'lucide-react'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { TravelInsights } from '@/components/stats/TravelInsights'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" /> }
)

type TabType = 'albums' | 'map' | 'achievements' | 'saved'

export default function ProfilePage() {
  const router = useRouter()
  const { user: currentUser, profile } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const [showInviteDialog, setShowInviteDialog] = useState(false)
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
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Avatar */}
              <div className="flex justify-center pt-6 pb-3">
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
              <div className="text-center px-4 pb-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {profile.display_name || profile.username || 'Anonymous User'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  @{profile.username || 'anonymous'}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 text-center px-4 pb-3 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Button */}
              <div className="px-4 pb-4">
                <Link href="/settings" className="block">
                  <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white">
                    Edit Profile
                  </Button>
                </Link>
              </div>

              {/* Following/Followers Stats */}
              <div className="grid grid-cols-2 border-t border-gray-100">
                <button className="py-4 text-center hover:bg-gray-50 transition-colors border-r border-gray-100">
                  <div className="font-bold text-gray-900">{followStats.followingCount}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Following</div>
                </button>
                <button className="py-4 text-center hover:bg-gray-50 transition-colors">
                  <div className="font-bold text-gray-900">{followStats.followersCount}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Followers</div>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-600">Albums</span>
                  <span className="text-base font-bold text-gray-900">{albums.length}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-600">Countries</span>
                  <span className="text-base font-bold text-gray-900">{countriesCount}</span>
                </div>
              </div>
            </div>

            {/* Streak Tracker */}
            <StreakTracker />

            {/* Travel Insights */}
            <TravelInsights />
          </div>

          {/* Right Content - Tabs and Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`flex-1 py-4 px-4 text-sm font-semibold transition-all relative ${
                    activeTab === 'albums'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Albums
                  {activeTab === 'albums' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex-1 py-4 px-4 text-sm font-semibold transition-all relative ${
                    activeTab === 'map'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Map View
                  {activeTab === 'map' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`flex-1 py-4 px-4 text-sm font-semibold transition-all relative ${
                    activeTab === 'achievements'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Achievements
                  {activeTab === 'achievements' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-4 px-4 text-sm font-semibold transition-all relative ${
                    activeTab === 'saved'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Saved
                  {activeTab === 'saved' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'albums' && (
              <>
                {albums.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {albums.map((album) => (
                      <Link
                        key={album.id}
                        href={`/albums/${album.id}`}
                        className="group relative aspect-square overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-sm font-medium line-clamp-2">
                              {album.title}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
                    <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm mb-4">No albums yet</p>
                    <Link href="/albums/new">
                      <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                        Create Your First Album
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === 'map' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="w-full h-[550px] sm:h-[650px] md:h-[750px] lg:h-[850px] xl:h-[900px] bg-gradient-to-br from-slate-900 to-slate-800 relative">
                  <EnhancedGlobe filterUserId={currentUser.id} hideHeader={true} />
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <AchievementsBadges userId={currentUser.id} showAll />
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
                <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Saved albums feature coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Friends Dialog */}
      <InviteFriendsDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  )
}