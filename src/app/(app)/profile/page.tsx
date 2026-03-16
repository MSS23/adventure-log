'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Grid, Trophy, AlertCircle, ChevronRight, UserPlus, Share2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Album } from '@/types/database'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'
import { GlobePreviewCard } from '@/components/profile/GlobePreviewCard'
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { TravelMapCard } from '@/components/profile/TravelMapCard'
import { ProfileHeaderShimmer, AlbumGridShimmer } from '@/components/ui/shimmer-skeleton'

type TabType = 'albums' | 'badges'

const tabs = [
  { id: 'albums' as TabType, label: 'Albums', icon: Grid },
  { id: 'badges' as TabType, label: 'Badges', icon: Trophy },
]

export default function ProfilePage() {
  const { user: currentUser, profile, authLoading, profileLoading, refreshProfile } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const [countryCodes, setCountryCodes] = useState<string[]>([])
  const [travelStats, setTravelStats] = useState({ countries: 0, cities: 0, photos: 0 })
  const [showInvite, setShowInvite] = useState(false)
  const supabase = createClient()

  const fetchUserData = useCallback(async () => {
    if (!currentUser || !profile) { setLoading(false); return }

    try {
      setLoading(true)

      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*, photos(id)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (albumsError) throw albumsError
      setAlbums(albumsData || [])

      const totalPhotos = (albumsData || []).reduce((sum, album) => sum + (album.photos?.length || 0), 0)

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', currentUser.id).eq('status', 'accepted'),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', currentUser.id).eq('status', 'accepted'),
      ])

      setFollowStats({
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      })

      const codes = [...new Set((albumsData || []).filter(a => a.country_code).map(a => a.country_code as string))]
      const uniqueCities = new Set((albumsData || []).filter(a => a.location_name).map(a => a.location_name?.split(',')[0]?.trim()))

      setCountryCodes(codes)
      setTravelStats({ countries: codes.length, cities: uniqueCities.size, photos: totalPhotos })
    } catch (err) {
      log.error('Error fetching user data', { component: 'ProfilePage' }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [currentUser, profile, supabase])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  useEffect(() => {
    const handleVisibility = () => { if (!document.hidden && currentUser) fetchUserData() }
    const handleFocus = () => { if (currentUser) fetchUserData() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUser, fetchUserData])

  const isAuthLoading = authLoading || profileLoading
  const isPageLoading = loading || isAuthLoading

  // Not authenticated
  if (!isAuthLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <Grid className="h-7 w-7 text-stone-400" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 mb-4">Log in to view your profile</p>
          <Link href="/login"><Button className="bg-olive-600 hover:bg-olive-700 text-white">Log In</Button></Link>
        </div>
      </div>
    )
  }

  // Profile failed to load
  if (!isAuthLoading && currentUser && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-olive-500 mx-auto mb-3" />
          <p className="text-stone-500 dark:text-stone-400 mb-4">Unable to load profile</p>
          <Button onClick={() => refreshProfile()} className="bg-olive-600 hover:bg-olive-700 text-white">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Profile Hero */}
      {isPageLoading ? <ProfileHeaderShimmer /> : profile ? (
        <ProfileHero profile={profile} isOwnProfile={true} followStats={followStats} />
      ) : null}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_300px] gap-4 md:gap-5 lg:gap-6">
          {/* Main Column */}
          <div className="space-y-4">
            {/* Passport CTA - visible on all screens */}
            {!isPageLoading && albums.length > 0 && (
              <Link href="/passport">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-olive-600 to-olive-700 dark:from-olive-700 dark:to-olive-800 text-white hover:from-olive-700 hover:to-olive-800 transition-all group shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Travel Passport</p>
                      <p className="text-olive-200 text-xs">{travelStats.countries} countries &middot; {travelStats.cities} cities &middot; {travelStats.photos} photos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-olive-200 group-hover:text-white transition-colors" />
                    <ChevronRight className="h-4 w-4 text-olive-200 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-stone-200 dark:border-stone-700">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'text-olive-600 dark:text-olive-400'
                      : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                    }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profileTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-olive-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
              >
                {isPageLoading ? (
                  <AlbumGridShimmer count={6} />
                ) : activeTab === 'albums' ? (
                  <ProfileAlbumGrid albums={albums} isOwnProfile={true} />
                ) : activeTab === 'badges' ? (
                  <div className="bg-white dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700/60 p-5">
                    {currentUser && <AchievementsBadges userId={currentUser.id} showAll />}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">
            {/* Globe Preview */}
            <GlobePreviewCard albumCount={albums.length} countryCount={travelStats.countries} />

            {/* Travel Map */}
            {currentUser && !isPageLoading && countryCodes.length > 0 && (
              <TravelMapCard
                userId={currentUser.id}
                displayName={profile?.display_name || profile?.username || 'Traveler'}
                countryCodes={countryCodes}
                cityCount={travelStats.cities}
                albumCount={albums.length}
              />
            )}

            {/* Quick Links */}
            {!isPageLoading && albums.length > 0 && (
              <div className="space-y-2">
                <Link href="/passport" className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-800/80 hover:border-olive-300 dark:hover:border-olive-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-olive-100 dark:bg-olive-900/40 flex items-center justify-center">
                      <span className="text-sm">🛂</span>
                    </div>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors">Travel Passport</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </Link>
                <Link href="/analytics" className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-800/80 hover:border-olive-300 dark:hover:border-olive-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-olive-100 dark:bg-olive-900/40 flex items-center justify-center">
                      <span className="text-sm">📊</span>
                    </div>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors">Analytics</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </Link>
                <Link href="/wrapped" className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-800/80 hover:border-olive-300 dark:hover:border-olive-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-olive-100 dark:bg-olive-900/40 flex items-center justify-center">
                      <span className="text-sm">✨</span>
                    </div>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors">{new Date().getFullYear()} Wrapped</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </Link>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex items-center justify-between w-full p-3 rounded-xl border border-olive-200/60 dark:border-olive-800/40 bg-olive-50 dark:bg-olive-900/20 hover:bg-olive-100 dark:hover:bg-olive-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-olive-200/60 dark:bg-olive-800/40 flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                    </div>
                    <span className="text-sm font-medium text-olive-700 dark:text-olive-300">Invite Friends</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-olive-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Dialog */}
      <InviteFriendsDialog isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}
