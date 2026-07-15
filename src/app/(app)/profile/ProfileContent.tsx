'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Map as MapIcon,
  Users as UsersIcon,
  UserPlus,
  ArrowUpRight,
  Compass,
} from 'lucide-react'
import Link from 'next/link'
import { Album, User } from '@/types/database'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { ProfileAlbumGrid } from '@/components/profile/ProfileAlbumGrid'
import { InviteFriendsDialog } from '@/components/share/InviteFriendsDialog'
import { AlbumGridShimmer } from '@/components/ui/shimmer-skeleton'
import { cn } from '@/lib/utils'
import { getCountryName, getFlagEmoji } from '@/lib/utils/country'

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
  const [albums, setAlbums] = useState<Album[]>(initialAlbums)
  // Start in the loading state when no server data was provided (the mobile /
  // client-only page passes empty initials and relies on the mount fetch
  // below), so the shimmer shows instead of a flash of empty state.
  const [loading, setLoading] = useState(initialAlbums.length === 0)
  const [activeTab, setActiveTab] = useState<TabType>('albums')
  const [followStats, setFollowStats] = useState(initialFollowStats)
  const [travelStats, setTravelStats] = useState(initialTravelStats)
  const [showInvite, setShowInvite] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const fetchingRef = useRef(false)
  const supabase = createClient()
  const countryCodes = [
    ...new Set([
      ...initialCountryCodes.map((code) => code.toUpperCase()),
      ...albums
        .filter((album) => album.country_code)
        .map((album) => (album.country_code as string).toUpperCase()),
    ]),
  ]

  // "Friends joined from your shares" — count of users whose referred_by is
  // this user (stamped by claim_referral, migration 71). SECURITY DEFINER
  // RPC returns only the caller's own count; any failure (migration not
  // applied yet) just leaves the stat hidden.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .rpc('count_referrals', { _user_id: userId })
      .then(({ data, error }) => {
        if (cancelled || error) return
        const n = typeof data === 'number' ? data : Number(data)
        if (Number.isFinite(n)) setReferralCount(n)
      })
    return () => {
      cancelled = true
    }
  }, [userId, supabase])

  // Refetch keys off the server-provided userId (the user this page renders),
  // never the client auth context — so the stats can't drift to another user.
  // `silent` skips the loading shimmer for background refreshes.
  const fetchUserData = useCallback(async ({ silent = false } = {}) => {
    if (!userId || fetchingRef.current) return
    fetchingRef.current = true

    try {
      if (!silent) setLoading(true)

      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*, photos(id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (albumsError) throw albumsError
      const publishedAlbums = (albumsData || []).filter(a => (a.photos?.length || 0) > 0)
      setAlbums(publishedAlbums)

      const totalPhotos = publishedAlbums.reduce((sum, album) => sum + (album.photos?.length || 0), 0)

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId).eq('status', 'accepted'),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId).eq('status', 'accepted'),
      ])

      setFollowStats({
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      })

      const codes = [
        ...new Set(
          publishedAlbums
            .filter(a => a.country_code)
            .map(a => (a.country_code as string).toUpperCase())
        ),
      ]
      const uniqueCities = new Set(publishedAlbums.filter(a => a.location_name).map(a => a.location_name?.split(',')[0]?.trim()))

      setTravelStats({ countries: codes.length, cities: uniqueCities.size, photos: totalPhotos })
    } catch (err) {
      // Supabase errors are plain objects — String(err) yields "[object Object]",
      // which is what Sentry would receive. Surface code + message instead.
      const supaErr = err as { code?: string; message?: string } | null
      const error = err instanceof Error
        ? err
        : new Error(supaErr?.message ? `[${supaErr.code ?? 'unknown'}] ${supaErr.message}` : JSON.stringify(err))
      log.error('Error fetching user data', { component: 'ProfileContent' }, error)
    } finally {
      fetchingRef.current = false
      if (!silent) setLoading(false)
    }
  }, [userId, supabase])

  // Initial load. The page no longer server-fetches (it's client-only so it can
  // static-export for the mobile bundle), so pull the data on mount when we
  // weren't handed any. Runs once per userId.
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current || initialAlbums.length > 0) return
    initialLoadDone.current = true
    fetchUserData()
  }, [fetchUserData, initialAlbums.length])

  // Quietly refresh when returning to the tab — no skeleton flash over
  // already-rendered content.
  useEffect(() => {
    const handleVisibility = () => { if (!document.hidden) fetchUserData({ silent: true }) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchUserData])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Hero — compact cover + avatar + bio + follow counts */}
      <ProfileHero profile={profile} isOwnProfile={true} followStats={followStats} />

      {/* Single section stack — consistent 32px rhythm, inherits app-shell padding */}
      <div className="mt-8 px-4 sm:px-6 space-y-8">
        {/* Travel snapshot — 3 calm stat tiles */}
        <div className="grid grid-cols-3 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-resting)]">
          {[
            { label: 'Countries', value: travelStats.countries },
            { label: 'Cities', value: travelStats.cities },
            { label: 'Albums', value: albums.length },
          ].map((stat, index) => (
            <div key={stat.label} className={cn('px-2 py-5 text-center sm:p-6', index > 0 && 'border-l border-border')}>
              <p className="al-stat-value text-2xl sm:text-3xl">{stat.value}</p>
              <p className="al-eyebrow mt-1 text-[9px] sm:text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>

        {countryCodes.length > 0 && (
          <section aria-labelledby="visited-countries-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p id="visited-countries-heading" className="al-eyebrow flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Visited countries
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One pin for every country in your travel history.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] tracking-wider text-muted-foreground">
                {countryCodes.length} total
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {countryCodes.map((code) => (
                <span
                  key={code}
                  title={getCountryName(code)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-[var(--shadow-resting)]"
                >
                  <span className="text-lg leading-none" aria-hidden>{getFlagEmoji(code)}</span>
                  <span>{getCountryName(code)}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Quiet referral stat — only shows once at least one share converted */}
        {referralCount > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5 text-primary" />
            {referralCount === 1
              ? '1 friend joined from your shares'
              : `${referralCount} friends joined from your shares`}
          </p>
        )}

        {/* Two things the user reaches for most — Passport & Wrapped */}
        <div className="grid grid-cols-2 gap-3">
          <FeatureTile
            href="/passport"
            icon={<Book className="h-5 w-5" />}
            label="Passport"
            hint="Share & connect"
          />
          <FeatureTile
            href="/wrapped"
            icon={<Sparkles className="h-5 w-5" />}
            label="Wrapped"
            hint="Your year in motion"
          />
        </div>

        {/* Secondary tools — quiet, grouped, still one tap away */}
        <section>
          <div className="mb-3">
            <p className="al-eyebrow">Travel toolkit</p>
            <p className="mt-1 text-xs text-muted-foreground">Plan, revisit, and compare your world.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ProfileToolLink href="/wishlist" icon={<Star className="h-4 w-4" />} label="Wishlist" hint="Places you want to go" />
            <ProfileToolLink href="/saved" icon={<Bookmark className="h-4 w-4" />} label="Saved" hint="Albums worth returning to" />
            <ProfileToolLink href="/trips" icon={<MapIcon className="h-4 w-4" />} label="Trips" hint="Plan together with friends" />
            <ProfileToolLink href="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" hint="See your travel patterns" />
            <ProfileToolLink href="/travel-twins" icon={<UsersIcon className="h-4 w-4" />} label="Travel Twins" hint="Find people with your footprint" />
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-[var(--shadow-resting)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Invite friends</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">Build your travel circle</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </div>
        </section>

        {/* Simple tab pair — Adventures / Badges */}
        <div role="tablist" aria-label="Profile sections" className="grid grid-cols-2 rounded-2xl border border-border bg-muted/55 p-1">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative min-h-11 rounded-xl px-5 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
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
                <AchievementsBadges userId={userId} showAll />
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
function ProfileToolLink({
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
      className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-resting)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
