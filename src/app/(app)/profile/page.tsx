'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Loader2, Grid, Map, Trophy, Bookmark } from 'lucide-react'
import { Album } from '@/types/database'
import dynamic from 'next/dynamic'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { TravelInsights } from '@/components/stats/TravelInsights'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { AnimatedStatsGrid } from '@/components/profile/AnimatedStatsGrid'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-2xl" /> }
)

type TabType = 'albums' | 'map' | 'achievements' | 'saved'

const tabs = [
  { id: 'albums' as TabType, label: 'Albums', icon: Grid },
  { id: 'map' as TabType, label: 'Map View', icon: Map },
  { id: 'achievements' as TabType, label: 'Achievements', icon: Trophy },
  { id: 'saved' as TabType, label: 'Saved', icon: Bookmark },
]

export default function ProfilePage() {
  const { user: currentUser, profile } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const [travelStats, setTravelStats] = useState({
    countries: 0,
    cities: 0,
    photos: 0,
    distance: 0
  })
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

  // Calculate cities from location names
  const citiesCount = useMemo(() => {
    const uniqueCities = new Set(
      albums
        .filter(a => a.location_name)
        .map(a => a.location_name?.split(',')[0]?.trim())
    )
    return uniqueCities.size
  }, [albums])

  const fetchUserData = useCallback(async () => {
    if (!currentUser || !profile) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch user's albums with photos
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*, photos(id)')
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

      // Calculate total photos
      const totalPhotos = (albumsData || []).reduce((sum, album) => {
        return sum + (album.photos?.length || 0)
      }, 0)

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

      // Update travel stats
      const uniqueCountries = new Set(
        (albumsData || []).filter(a => a.country_code).map(a => a.country_code)
      )
      const uniqueCities = new Set(
        (albumsData || []).filter(a => a.location_name).map(a => a.location_name?.split(',')[0]?.trim())
      )

      setTravelStats({
        countries: uniqueCountries.size,
        cities: uniqueCities.size,
        photos: totalPhotos,
        distance: 0 // Will be calculated by TravelInsights component
      })

    } catch (err) {
      log.error('Error fetching user data', {
        component: 'ProfilePage'
      }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [currentUser, profile, supabase])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Refresh when page becomes visible
  useEffect(() => {
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
  }, [currentUser, fetchUserData])

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'albums':
        return <ProfileAlbumGrid albums={albums} isOwnProfile={true} />
      case 'map':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="w-full h-[550px] sm:h-[650px] md:h-[750px] lg:h-[850px] xl:h-[900px] bg-gradient-to-br from-slate-900 to-slate-800 relative">
              <EnhancedGlobe filterUserId={currentUser.id} hideHeader={true} className="h-full" />
            </div>
          </div>
        )
      case 'achievements':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <AchievementsBadges userId={currentUser.id} showAll />
          </div>
        )
      case 'saved':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 text-center py-16"
          >
            <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Saved albums feature coming soon</p>
          </motion.div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 pb-24 md:pb-8">
      {/* Profile Hero */}
      <ProfileHero
        profile={profile}
        isOwnProfile={true}
        followStats={followStats}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="mb-8">
          <AnimatedStatsGrid
            stats={{
              countries: travelStats.countries,
              cities: travelStats.cities,
              photos: travelStats.photos,
              distance: travelStats.distance
            }}
            onStatClick={(stat) => {
              if (stat === 'photos') setActiveTab('albums')
            }}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content - Tabs */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-4 px-4 text-sm font-semibold transition-all
                               flex items-center justify-center gap-2
                               ${activeTab === tab.id
                                 ? 'text-teal-600'
                                 : 'text-gray-500 hover:text-gray-700'
                               }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content with Animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Streak Tracker */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <StreakTracker />
            </motion.div>

            {/* Travel Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TravelInsights />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
