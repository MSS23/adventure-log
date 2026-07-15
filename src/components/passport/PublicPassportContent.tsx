'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, MapPin, Camera, Plane, Users, Share2, Copy, Check, ArrowRight,
  Trophy, Route, UserCheck, Landmark, Mountain, TreePine, Waves, Sun,
  AlertCircle,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { formatDistanceKm } from '@/lib/utils/geoCalculations'
import { formatTravelDate } from '@/lib/utils/travel-date'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MutualTravelPanel } from './MutualTravelPanel'
import { PassportQrCode } from './PassportQrCode'

const continentIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  'Europe': Landmark, 'Asia': Mountain, 'North America': TreePine,
  'South America': TreePine, 'Africa': Sun, 'Oceania': Waves,
}


// ---------------------------------------------------------------------------
// Globe Coverage Ring
// ---------------------------------------------------------------------------
function GlobeCoverageRing({ percentage, countriesCount }: { percentage: number; countriesCount: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" stroke="var(--muted)" />
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="7"
          stroke="var(--color-coral)" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="al-stat-value text-2xl tabular-nums">{percentage.toFixed(1)}%</span>
        <span className="font-mono text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
          {countriesCount} / 195
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  user: { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null; created_at: string }
  countryCodes: string[]
  cities: string[]
  totalAlbums: number
  totalPhotos: number
  totalDistance: number
  followerCount: number
  continentsVisited: string[]
  personality: string
  firstTrip: { title: string; location: string | null; date: string; latitude?: number | null } | null
  latestTrip: { title: string; location: string | null; date: string; latitude?: number | null } | null
  memberSince: string
}

export function PublicPassportContent({
  user, countryCodes, cities, totalPhotos, totalDistance,
  followerCount, continentsVisited, personality, firstTrip, latestTrip, memberSince
}: Props) {
  const displayName = getDisplayName(user.display_name, user.username)
  const [copied, setCopied] = useState(false)
  const worldPercent = (countryCodes.length / 195) * 100
  const searchParams = useSearchParams()
  const { user: currentUser, profile } = useAuth()
  const viewerName = getDisplayName(profile?.display_name, profile?.username) || 'You'

  // A logged-in person viewing someone else's passport (e.g. via QR scan).
  const isOtherViewer = !!currentUser && currentUser.id !== user.id

  // Auto-connect state
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'connected' | 'pending' | 'following' | 'error'>('idle')
  const [showConnected, setShowConnected] = useState(false)
  // Connected, but the reverse (owner→you) follow is still awaiting YOUR
  // approval (private account + tokenless link) — the blend stays one-sided
  // until it's accepted, so don't celebrate an unconditional connection.
  const [mutualPending, setMutualPending] = useState(false)
  const connectAttempted = useRef(false)

  // Signed QR-connect token (`t`) carried through the scanner from the
  // owner's on-screen QR. Present → the server treats the scan as in-person
  // proof and connects instantly even for private/friends accounts. Absent
  // (long-lived share link) → private/friends owners get a follow request.
  const qrToken = searchParams.get('t')

  // The connect attempt, callable again from the error banner's "Try again"
  // (connectAttempted only guards the AUTOMATIC attempt against effect
  // re-runs/StrictMode — manual retries bypass it deliberately).
  const attemptConnect = useCallback(() => {
    setConnectStatus('connecting')

    const postConnect = () =>
      apiFetch('/api/passport/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user.id,
          ...(qrToken ? { qrToken } : {}),
        }),
      })

    postConnect()
      .then(async (res) => {
        // A 401 right after a scan is usually an access token that expired in
        // the WebView while the server can't mint a refreshed one mid-request
        // (its cookie adapter is read-only for bearer auth). Force a client
        // refresh and retry exactly once — this was a "first scan fails,
        // second works" source on the APK.
        if (res.status === 401) {
          const { createClient } = await import('@/lib/supabase/client')
          const { error: refreshError } = await createClient().auth.refreshSession()
          if (!refreshError) {
            return postConnect()
          }
        }
        return res
      })
      .then(async (res) => {
        // Non-2xx (expired session, rate limit, server error) must land in the
        // error branch — the body may not even be JSON.
        const data = res.ok ? await res.json() : null
        if (data?.connected) {
          setMutualPending(data.mutual === false)
          setConnectStatus('connected')
          setShowConnected(true)
        } else if (data?.pending) {
          // Private/friends owner + no valid QR token: the server sent a
          // follow REQUEST instead of auto-accepting. No connected modal, no
          // blend CTA — the owner still has to approve.
          setConnectStatus('pending')
        } else if (data?.following) {
          // Scanner already follows this private owner one-way; nothing new
          // was sent — say so truthfully instead of claiming a request went out.
          setConnectStatus('following')
        } else {
          setConnectStatus('error')
          log.error('Passport auto-connect rejected', {
            component: 'PublicPassport',
            action: 'connect',
          })
        }
      })
      .catch(() => {
        setConnectStatus('error')
        log.error('Passport auto-connect failed', { component: 'PublicPassport', action: 'connect' })
      })
  }, [user.id, qrToken])

  // Auto-connect when arriving via QR scan (?connect=true)
  useEffect(() => {
    const shouldConnect = searchParams.get('connect') === 'true'
    if (!shouldConnect || !currentUser || currentUser.id === user.id || connectAttempted.current) return
    connectAttempted.current = true
    attemptConnect()
  }, [searchParams, currentUser, user.id, attemptConnect])

  // Canonical public passport URL on the web origin. This component also
  // renders inside the APK (/passport/view twin) where window.location.href
  // is capacitor://localhost — a dead link for anyone it's shared with.
  // ?ref= credits the passport owner so signups auto-follow them.
  const shareUrl = withRef(`${getWebOrigin()}/u/${user.username}/passport`, user.username)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    trackGrowthEvent('share_link_created', { meta: { surface: 'public_passport' } })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const text = `Check out ${displayName}'s travel profile on Roamkeep!`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s Travel Profile`, text, url: shareUrl })
        trackGrowthEvent('share_link_created', { meta: { surface: 'public_passport' } })
      } else {
        await handleCopy()
      }
    } catch { /* cancelled */ }
  }

  const allContinents = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania']

  return (
    <div className="min-h-screen bg-background">
      {/* Connection success — both travelers appear, confirm you've connected,
          then tap through into the Travel Blend. Shown right after a scan
          lands here with ?connect=true and the mutual follow succeeds. */}
      <AnimatePresence>
        {showConnected && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Connected"
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              {/* Both accounts */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <Avatar className="size-16 ring-2 ring-background shadow">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.username)} alt={viewerName} />
                  <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                    {getDisplayInitial(profile?.display_name, profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-coral)] text-white shadow-md">
                  <UserCheck className="size-4" />
                </span>
                <Avatar className="size-16 ring-2 ring-background shadow">
                  <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={displayName} />
                  <AvatarFallback className="bg-olive-200 text-olive-800 font-semibold">
                    {getDisplayInitial(user.display_name, user.username)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <p className="al-eyebrow mb-1">Connected</p>
              <h2 className="al-display text-2xl mb-1.5">You&apos;re now connected</h2>
              {mutualPending ? (
                <p className="text-sm text-muted-foreground mb-6">
                  You now follow <span className="font-semibold text-foreground">{displayName}</span>.
                  Your account is private, so approve their follow request to unlock
                  your shared Travel Blend.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">
                  You and <span className="font-semibold text-foreground">{displayName}</span> now follow each other.
                </p>
              )}

              {mutualPending ? (
                <Link
                  href="/followers"
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-[color:var(--color-coral)] text-white font-semibold px-5 py-3 shadow-lg transition-transform active:scale-[0.98]"
                >
                  Review follow request
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link
                  href={`/blend/${user.username}`}
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-[color:var(--color-coral)] text-white font-semibold px-5 py-3 shadow-lg transition-transform active:scale-[0.98]"
                >
                  See your Travel Blend
                  <ArrowRight className="size-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setShowConnected(false)}
                className="mt-3 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                View {displayName}&apos;s passport
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Hero ── */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-olive-800 via-olive-900 to-[#0f1f05]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.15)_0%,_transparent_50%)]" />

        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Avatar className="w-24 h-24 mx-auto mb-4 ring-2 ring-white/20">
              <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={displayName} />
              <AvatarFallback className="text-2xl bg-olive-700 text-white font-heading">
                {getDisplayInitial(user.display_name, user.username)}
              </AvatarFallback>
            </Avatar>

            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-1 break-words">{displayName}</h1>
            <p className="text-white/90 mb-3 text-sm">@{user.username}</p>
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Trophy className="h-4 w-4 text-white/90" />
            <span className="text-white font-semibold text-sm">{personality}</span>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-auto block" preserveAspectRatio="none">
            <path d="M0 60V20C240 0 480 0 720 10C960 20 1200 40 1440 30V60H0Z" className="fill-background" />
          </svg>
        </div>
      </motion.section>

      <div className="max-w-3xl mx-auto px-6">
        {/* ── Mutual travel — "where your paths cross" (logged-in viewers) ── */}
        {isOtherViewer && (
          <MutualTravelPanel
            ownerId={user.id}
            ownerName={displayName}
            ownerAvatarUrl={user.avatar_url}
            ownerUsername={user.username}
            ownerCountryCodes={countryCodes}
            ownerCities={cities}
          />
        )}

        {/* ── Connection Banner ── */}
        <AnimatePresence>
          {connectStatus === 'connected' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 relative z-20"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <UserCheck className="size-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  {mutualPending ? (
                    <>
                      You follow <span className="font-semibold">{displayName}</span> — approve their{' '}
                      <Link href="/followers" className="font-semibold underline underline-offset-2">
                        follow request
                      </Link>{' '}
                      to unlock your Travel Blend
                    </>
                  ) : (
                    <>
                      You and <span className="font-semibold">{displayName}</span> are now following each other
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          )}
          {connectStatus === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 relative z-20"
            >
              <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Users className="size-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  Follow request sent to <span className="font-semibold">{displayName}</span> — you&apos;ll connect once they accept
                </p>
              </div>
            </motion.div>
          )}
          {connectStatus === 'following' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 relative z-20"
            >
              <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Users className="size-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">
                  You follow <span className="font-semibold">{displayName}</span> — they haven&apos;t followed you back yet
                </p>
              </div>
            </motion.div>
          )}
          {connectStatus === 'connecting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 relative z-20"
            >
              <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                <p className="text-sm text-muted-foreground">Connecting...</p>
              </div>
            </motion.div>
          )}
          {connectStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 relative z-20"
            >
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-4 text-destructive" />
                </div>
                <p className="text-sm text-foreground flex-1">
                  Couldn&apos;t connect with <span className="font-semibold">{displayName}</span> — check your connection
                </p>
                <button
                  type="button"
                  onClick={attemptConnect}
                  className="text-sm font-semibold text-primary shrink-0 hover:underline"
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats Bar ── */}
        <motion.div
          className={cn(
            "relative z-10 rounded-2xl border border-border bg-card p-5 mb-8",
            // The mutual-travel panel above already overlaps the hero wave for
            // logged-in viewers; only pull the stats card up when it's absent.
            !isOtherViewer && "-mt-6"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { icon: Globe, value: countryCodes.length, label: 'Countries' },
              { icon: MapPin, value: cities.length, label: 'Cities' },
              { icon: Camera, value: totalPhotos, label: 'Photos' },
              { icon: Route, value: formatDistanceKm(totalDistance), label: 'Traveled' },
              { icon: Users, value: followerCount, label: 'Followers' },
              { icon: Globe, value: `${worldPercent.toFixed(1)}%`, label: 'of World' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <stat.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="al-stat-value text-xl md:text-2xl tabular-nums">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="al-eyebrow text-[10px]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Globe Coverage Ring ── */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <GlobeCoverageRing percentage={worldPercent} countriesCount={countryCodes.length} />
        </motion.div>

        {/* ── Continent Progress ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <p className="al-eyebrow mb-3">Continents</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allContinents.map((continent, i) => {
              const visited = continentsVisited.includes(continent)
              return (
                <motion.div
                  key={continent}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card transition-colors duration-200",
                    visited
                      ? "hover:border-primary/30"
                      : "opacity-50"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: visited ? 1 : 0.5, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  {(() => {
                    const Icon = continentIcon[continent] || Globe
                    return <Icon className={cn("h-5 w-5", visited ? "text-primary" : "text-muted-foreground")} />
                  })()}
                  <div>
                    <p className={cn("text-sm font-semibold", visited ? "text-foreground" : "text-muted-foreground")}>
                      {continent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {visited ? '✓ Explored' : 'Not yet'}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Countries Visited ── */}
        {countryCodes.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <p className="al-eyebrow mb-3">Countries Visited</p>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                {countryCodes.map((code, i) => (
                  <motion.div
                    key={code}
                    className="group relative"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.02, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 hover:bg-primary/15 hover:border-primary/30 transition-colors duration-200 cursor-default">
                      <span className="text-xl leading-none">{getFlagEmoji(code)}</span>
                      <span className="font-mono text-xs font-semibold text-primary">{code}</span>
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {getCountryName(code)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Travel Timeline ── */}
        {(firstTrip || latestTrip) && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <p className="al-eyebrow mb-3">Journey</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {firstTrip && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="al-eyebrow text-[10px]">First Adventure</span>
                  </div>
                  <p className="font-heading font-semibold text-foreground">{firstTrip.title}</p>
                  {firstTrip.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {firstTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="font-mono text-xs tracking-wide text-muted-foreground mt-1">
                    {formatTravelDate(firstTrip.date, { view: 'fuzzy', latitude: firstTrip.latitude ?? undefined })}
                  </p>
                </div>
              )}
              {latestTrip && latestTrip !== firstTrip && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="al-eyebrow text-[10px]">Latest Adventure</span>
                  </div>
                  <p className="font-heading font-semibold text-foreground">{latestTrip.title}</p>
                  {latestTrip.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {latestTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="font-mono text-xs tracking-wide text-muted-foreground mt-1">
                    {formatTravelDate(latestTrip.date, { view: 'fuzzy', latitude: latestTrip.latitude ?? undefined })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Share — QR Code ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="rounded-2xl border border-border bg-card">
            <div className="py-8 sm:py-10 px-6 flex flex-col items-center text-center">
              <h2 className="font-heading text-base md:text-lg font-semibold text-foreground">Share this profile</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                Scan to see {displayName}&apos;s travel profile
              </p>

              <div className="mb-6">
                <PassportQrCode url={shareUrl} size={160} label={`${displayName}'s passport QR code`} />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="cursor-pointer gap-2"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    size="sm"
                    onClick={handleShare}
                    className="cursor-pointer gap-2"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.footer
          className="text-center py-10 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p className="font-mono text-xs tracking-wide text-muted-foreground mb-1">
            Member since {new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Powered by{' '}
            <Link href="/" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Roamkeep
            </Link>
          </p>
          <Link href="/signup">
            <Button variant="coral" className="cursor-pointer px-8 gap-2">
              Create Your Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
