'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import {
  Grid,
  Trophy,
  ChevronRight,
  BarChart3,
  Sparkles,
  Book,
  Star,
  Bookmark,
  Users as UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Album, User } from '@/types/database'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'
import { GlobePreviewCard } from '@/components/profile/GlobePreviewCard'
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { TravelMapCard } from '@/components/profile/TravelMapCard'
import { AlbumGridShimmer } from '@/components/ui/shimmer-skeleton'

type TabType = 'albums' | 'badges'

const tabs = [
  { id: 'albums' as TabType, label: 'Albums', icon: Grid },
  { id: 'badges' as TabType, label: 'Badges', icon: Trophy },
]

export interface ProfileContentProps {
  profile: User
  userId: string
  initialAlbums: Album[]
  initialFollowStats: {
    followersCount: number
    followingCount: number
  }
  initialCountryCodes: string[]
  initialTravelStats: {
    countries: number
    cities: number
    photos: number
  }
}

export default function ProfileContent({
  profile,
  userId,
  initialAlbums,
  initialFollowStats,
  initialCountryCodes,
  initialTravelStats,
}: ProfileContentProps) {
  const { user: currentUser } = useAuth()
  const [albums, setAlbums] = useState<Album[]>(initialAlbums)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState(initialFollowStats)
  const [countryCodes, setCountryCodes] = useState<string[]>(initialCountryCodes)
  const [travelStats, setTravelStats] = useState(initialTravelStats)
  const [showInvite, setShowInvite] = useState(false)
  const supabase = createClient()

  const fetchUserData = useCallback(async () => {
    if (!currentUser) return

    try {
      setLoading(true)

      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*, photos(id)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (albumsError) throw albumsError
      const publishedAlbums = (albumsData || []).filter(a => (a.photos?.length || 0) > 0)
      setAlbums(publishedAlbums)

      const totalPhotos = publishedAlbums.reduce((sum, album) => sum + (album.photos?.length || 0), 0)

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', currentUser.id).eq('status', 'accepted'),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', currentUser.id).eq('status', 'accepted'),
      ])

      setFollowStats({
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      })

      const codes = [...new Set(publishedAlbums.filter(a => a.country_code).map(a => a.country_code as string))]
      const uniqueCities = new Set(publishedAlbums.filter(a => a.location_name).map(a => a.location_name?.split(',')[0]?.trim()))

      setCountryCodes(codes)
      setTravelStats({ countries: codes.length, cities: uniqueCities.size, photos: totalPhotos })
    } catch (err) {
      log.error('Error fetching user data', { component: 'ProfileContent' }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [currentUser, supabase])

  // Refetch when returning to the tab
  useEffect(() => {
    const handleVisibility = () => { if (!document.hidden && currentUser) fetchUserData() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [currentUser, fetchUserData])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Hero — compact cover + avatar + bio + follow counts */}
      <ProfileHero profile={profile} isOwnProfile={true} followStats={followStats} />

      {/* Travel snapshot — 3 clean stats, one row */}
      <div
        className="mt-5 mx-4 md:mx-0 p-5 rounded-2xl grid grid-cols-3 gap-2"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--color-line-warm)',
        }}
      >
        <div className="text-center">
          <div
            className="al-stat-value text-[28px]"
            style={{ color: 'var(--color-coral)' }}
          >
            {travelStats.countries}
          </div>
          <div className="al-eyebrow mt-1">Countries</div>
        </div>
        <div className="text-center">
          <div className="al-stat-value text-[28px]">{travelStats.cities}</div>
          <div className="al-eyebrow mt-1">Cities</div>
        </div>
        <div className="text-center">
          <div className="al-stat-value text-[28px]">{albums.length}</div>
          <div className="al-eyebrow mt-1">Albums</div>
        </div>
      </div>

      {/* Travel tools — secondary navigation without sidebar clutter.
          Everything the sidebar used to show is still here, just nested
          under You so first-time users aren't overwhelmed. */}
      <div className="mt-6 mx-4 md:mx-0">
        <p className="al-eyebrow mb-3">Your travel tools</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <ToolTile href="/passport" icon={<Book className="h-4 w-4" />} label="Passport" hint="Stamps · Countries" />
          <ToolTile href="/wrapped" icon={<Sparkles className="h-4 w-4" />} label="Wrapped" hint="Your year in motion" />
          <ToolTile href="/wishlist" icon={<Star className="h-4 w-4" />} label="Wishlist" hint="Where to next" />
          <ToolTile href="/saved" icon={<Bookmark className="h-4 w-4" />} label="Saved" hint="Bookmarked albums" />
          <ToolTile href="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" hint="Your numbers" />
          <ToolTile href="/achievements" icon={<Trophy className="h-4 w-4" />} label="Achievements" hint="Badges & levels" />
          <ToolTile href="/travel-twins" icon={<UsersIcon className="h-4 w-4" />} label="Travel Twins" hint="Who shares your map" />
          <ToolTile href="/followers" icon={<UsersIcon className="h-4 w-4" />} label="Followers" hint={`${followStats.followersCount}`} />
          <ToolTile href="/following" icon={<UsersIcon className="h-4 w-4" />} label="Following" hint={`${followStats.followingCount}`} />
        </div>
      </div>

      {/* Simple tab pair — Adventures / Badges */}
      <div
        className="mt-6 mx-4 md:mx-0 flex gap-1"
        style={{ borderBottom: '1px solid var(--color-line-warm)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-5 py-3 text-[13px] font-semibold transition-colors"
            style={{
              color:
                activeTab === tab.id
                  ? 'var(--color-ink)'
                  : 'var(--color-muted-warm)',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="profileTab"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'var(--color-coral)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content — single column, no sidebar clutter */}
      <div className="mt-5 mx-4 md:mx-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {loading ? (
              <AlbumGridShimmer count={6} />
            ) : activeTab === 'albums' ? (
              <ProfileAlbumGrid albums={albums} isOwnProfile={true} />
            ) : activeTab === 'badges' && userId ? (
              <div className="al-card p-5">
                <AchievementsBadges userId={userId} showAll />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Invite Dialog stays mounted */}
      <InviteFriendsDialog isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}

function ToolTile({
  href,
  icon,
  label,
  hint,
}: {
  href: string
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 p-3 rounded-xl transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--color-line-warm)',
      }}
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
        style={{
          background: 'var(--color-ivory-alt)',
          color: 'var(--color-coral)',
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[color:var(--color-ink)] leading-tight truncate">
          {label}
        </div>
        <div
          className="font-mono text-[10px] tracking-wide uppercase mt-0.5 truncate"
          style={{ color: 'var(--color-muted-warm)' }}
        >
          {hint}
        </div>
      </div>
      <ChevronRight className="h-3 w-3 text-[color:var(--color-muted-warm)] group-hover:text-[color:var(--color-coral)] transition-colors flex-shrink-0" />
    </Link>
  )
}
