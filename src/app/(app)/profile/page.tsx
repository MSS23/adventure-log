'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Grid, Trophy, Bookmark, AlertCircle, ChevronRight, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Album } from '@/types/database'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { ChallengesPanel } from '@/components/challenges/ChallengesPanel'
import { StreakTracker } from '@/components/gamification/StreakTracker'
import { TravelInsights } from '@/components/stats/TravelInsights'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'
import { GlobePreviewCard } from '@/components/profile/GlobePreviewCard'
import { TravelMapCard } from '@/components/profile/TravelMapCard'
import { EmbedCodeGenerator } from '@/components/embed/EmbedCodeGenerator'
import { MeshGradient } from '@/components/ui/animated-gradient'
import { GlassCard } from '@/components/ui/glass-card'
import { ProfileHeaderShimmer, AlbumGridShimmer } from '@/components/ui/shimmer-skeleton'

type TabType = 'albums' | 'achievements' | 'challenges' | 'saved'

const tabs = [
  { id: 'albums' as TabType, label: 'Albums', icon: Grid },
  { id: 'challenges' as TabType, label: 'Challenges', icon: Target },
  { id: 'achievements' as TabType, label: 'Badges', icon: Trophy },
  { id: 'saved' as TabType, label: 'Saved', icon: Bookmark },
]

export default function ProfilePage() {
  const { user: currentUser, profile, authLoading, profileLoading, refreshProfile } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  const [countryCodes, setCountryCodes] = useState<string[]>([])
  const [travelStats, setTravelStats] = useState({
    countries: 0,
    cities: 0,
    photos: 0,
    distance: 0
  })
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
      const countryCodesArray = [...new Set(
        (albumsData || []).filter(a => a.country_code).map(a => a.country_code as string)
      )]
      const uniqueCities = new Set(
        (albumsData || []).filter(a => a.location_name).map(a => a.location_name?.split(',')[0]?.trim())
      )

      setCountryCodes(countryCodesArray)
      setTravelStats({
        countries: countryCodesArray.length,
        cities: uniqueCities.size,
        photos: totalPhotos,
        distance: 0
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
      return <AlbumGridShimmer count={6} />
    }

    switch (activeTab) {
      case 'albums':
        return <ProfileAlbumGrid albums={albums} isOwnProfile={true} />
      case 'challenges':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {currentUser && <ChallengesPanel userId={currentUser.id} showAll />}
          </div>
        )
      case 'achievements':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {currentUser && <AchievementsBadges userId={currentUser.id} showAll />}
          </div>
        )
      case 'saved':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border border-gray-200 text-center py-16"
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
    <div className="min-h-screen relative pb-24 md:pb-8">
      {/* Mesh gradient background */}
      <MeshGradient variant="subtle" className="fixed inset-0 -z-10" />

      {/* Profile Hero */}
      {isPageLoading ? (
        <ProfileHeaderShimmer />
      ) : profile ? (
        <ProfileHero
          profile={profile}
          isOwnProfile={true}
          followStats={followStats}
        />
      ) : null}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content - Tabs */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <GlassCard variant="frost" padding="none" className="overflow-hidden">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-3.5 px-4 text-sm font-medium transition-all
                               flex items-center justify-center gap-2
                               ${activeTab === tab.id
                                 ? 'text-teal-600 bg-teal-50/50'
                                 : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                               }`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: activeTab === tab.id ? 0 : 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <tab.icon className="h-4 w-4" />
                    </motion.div>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar with staggered animations */}
          <motion.div
            className="space-y-4 lg:sticky lg:top-4 lg:self-start"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.1 }
              }
            }}
          >
            {/* Globe Preview Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 300, damping: 24 }
                }
              }}
            >
              <GlobePreviewCard
                albumCount={albums.length}
                countryCount={travelStats.countries}
              />
            </motion.div>

            {/* Share Travel Map Card */}
            {currentUser && !isPageLoading && countryCodes.length > 0 && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 300, damping: 24 }
                  }
                }}
              >
                <TravelMapCard
                  userId={currentUser.id}
                  displayName={profile?.display_name || profile?.username || 'Traveler'}
                  countryCodes={countryCodes}
                  cityCount={travelStats.cities}
                  albumCount={albums.length}
                />
              </motion.div>
            )}

            {/* Year in Review CTA */}
            {!isPageLoading && albums.length > 0 && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 300, damping: 24 }
                  }
                }}
              >
                <Link href="/wrapped">
                  <GlassCard
                    variant="frost"
                    hover="lift"
                    className="overflow-hidden cursor-pointer group"
                    padding="none"
                  >
                    <div className="p-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                          <span className="text-lg">&#10024;</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-violet-600 transition-colors">
                            {new Date().getFullYear()} Travel Wrapped
                          </p>
                          <p className="text-xs text-gray-500">See your year in review</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            )}

            {/* Streak Tracker */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 300, damping: 24 }
                }
              }}
            >
              <StreakTracker />
            </motion.div>

            {/* Travel Insights */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 300, damping: 24 }
                }
              }}
            >
              <TravelInsights />
            </motion.div>

            {/* Embed Code Generator */}
            {profile?.username && !isPageLoading && albums.length > 0 && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 300, damping: 24 }
                  }
                }}
              >
                <EmbedCodeGenerator username={profile.username} />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
