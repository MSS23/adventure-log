'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Grid, Trophy, Bookmark, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Album } from '@/types/database'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { TravelInsights } from '@/components/stats/TravelInsights'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { AnimatedStatsGrid } from '@/components/profile/AnimatedStatsGrid'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'
import { GlobeModal } from '@/components/profile/GlobeModal'
import { GlobePreviewCard } from '@/components/profile/GlobePreviewCard'

type TabType = 'albums' | 'achievements' | 'saved'

const tabs = [
  { id: 'albums' as TabType, label: 'Albums', icon: Grid },
  { id: 'achievements' as TabType, label: 'Achievements', icon: Trophy },
  { id: 'saved' as TabType, label: 'Saved', icon: Bookmark },
]

export default function ProfilePage() {
  const { user: currentUser, profile, authLoading, profileLoading, refreshProfile } = useAuth()
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
  const [showGlobeModal, setShowGlobeModal] = useState(false)
  const supabase = createClient()

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

  // Still loading auth - show page shell with loading content
  const isAuthLoading = authLoading || profileLoading
  const isPageLoading = loading || isAuthLoading

  // Not authenticated and auth is done loading - show login prompt
  if (!isAuthLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Grid className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">Please log in to view your profile</p>
          <Link href="/login">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Profile failed to load after auth completed - show error with retry
  if (!isAuthLoading && currentUser && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Unable to load profile</p>
          <Button
            onClick={() => refreshProfile()}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    )
  }

  const renderTabContent = () => {
    // Show loading skeleton if still loading
    if (isPageLoading) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'albums':
        return <ProfileAlbumGrid albums={albums} isOwnProfile={true} />
      case 'achievements':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {currentUser && <AchievementsBadges userId={currentUser.id} showAll />}
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

  // Show page shell with loading state or actual content
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 pb-24 md:pb-8">
      {/* Profile Hero - show skeleton if loading */}
      {isPageLoading ? (
        <div className="relative h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse">
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white" />
          </div>
        </div>
      ) : profile ? (
        <ProfileHero
          profile={profile}
          isOwnProfile={true}
          followStats={followStats}
          onViewGlobe={() => setShowGlobeModal(true)}
        />
      ) : null}

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
              if (stat === 'countries' || stat === 'cities') setShowGlobeModal(true)
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
            {/* Globe Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <GlobePreviewCard
                onOpenGlobe={() => setShowGlobeModal(true)}
                albumCount={albums.length}
                countryCount={travelStats.countries}
              />
            </motion.div>

            {/* Streak Tracker */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <StreakTracker />
            </motion.div>

            {/* Travel Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <TravelInsights />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Globe Modal */}
      {currentUser && (
        <GlobeModal
          open={showGlobeModal}
          onOpenChange={setShowGlobeModal}
          userId={currentUser.id}
        />
      )}
    </div>
  )
}
