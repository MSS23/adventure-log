'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import {
  Grid,
  Trophy,
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
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { AlbumGridShimmer } from '@/components/ui/shimmer-skeleton'
import { cn } from '@/lib/utils'

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
  const [, setCountryCodes] = useState<string[]>(initialCountryCodes)
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

      {/* Single section stack — consistent 32px rhythm, one horizontal inset */}
      <div className="mt-8 mx-4 md:mx-0 space-y-8">
        {/* Travel snapshot — 3 calm stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-resting)]">
            <p className="al-eyebrow">Countries</p>
            <p className="al-stat-value text-2xl sm:text-3xl mt-1">{travelStats.countries}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-resting)]">
            <p className="al-eyebrow">Cities</p>
            <p className="al-stat-value text-2xl sm:text-3xl mt-1">{travelStats.cities}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-resting)]">
            <p className="al-eyebrow">Albums</p>
            <p className="al-stat-value text-2xl sm:text-3xl mt-1">{albums.length}</p>
          </div>
        </div>

        {/* Two things the user reaches for most — Passport & Wrapped */}
        <div className="grid grid-cols-2 gap-3">
          <FeatureTile
            href="/passport"
            icon={<Book className="h-5 w-5" />}
            label="Passport"
            hint="Stamps & countries"
          />
          <FeatureTile
            href="/wrapped"
            icon={<Sparkles className="h-5 w-5" />}
            label="Wrapped"
            hint="Your year in motion"
          />
        </div>

        {/* Secondary tools — quiet, grouped, still one tap away */}
        <div className="flex flex-wrap gap-2">
          <QuietLink href="/wishlist" icon={<Star className="h-3.5 w-3.5" />} label="Wishlist" />
          <QuietLink href="/saved" icon={<Bookmark className="h-3.5 w-3.5" />} label="Saved" />
          <QuietLink href="/analytics" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Analytics" />
          <QuietLink href="/travel-twins" icon={<UsersIcon className="h-3.5 w-3.5" />} label="Travel Twins" />
        </div>

        {/* Simple tab pair — Adventures / Badges */}
        <div role="tablist" aria-label="Profile sections" className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-5 py-3 text-sm font-medium cursor-pointer transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-xl',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content — single column, no sidebar clutter */}
        <div>
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
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-resting)]">
                  <AchievementsBadges userId={userId} showAll />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Invite Dialog stays mounted */}
      <InviteFriendsDialog isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}

/** Primary entry point — Passport & Wrapped get prominence and breathing room. */
function FeatureTile({
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
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 cursor-pointer shadow-[var(--shadow-resting)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="font-heading text-base font-semibold text-foreground leading-tight">
          {label}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {hint}
        </div>
      </div>
    </Link>
  )
}

/** Secondary tool — quiet pill, grouped below the primary pair. */
function QuietLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-muted-foreground cursor-pointer shadow-[var(--shadow-resting)] transition-all duration-200 ease-out hover:bg-muted hover:text-foreground hover:shadow-[var(--shadow-hover)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="transition-colors duration-200 group-hover:text-primary">
        {icon}
      </span>
      {label}
    </Link>
  )
}
