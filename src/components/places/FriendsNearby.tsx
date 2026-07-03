'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LocateFixed, Loader2, MapPin, Star, Users } from 'lucide-react'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { haversineKm, formatDistanceKm } from '@/lib/utils/geoCalculations'
import { getFlagEmoji, getCityName } from '@/lib/utils/country'
import { log } from '@/lib/utils/logger'

/**
 * "Friends have been near…" — proximity strip for the Places page.
 *
 * Anchors two kinds of "near":
 *   1. Your wishlist pins (always available — no permission prompt needed)
 *   2. Your current position (only after the user taps "Near me now" —
 *      never auto-request geolocation on page load)
 *
 * Each friends' place (from usePlaces('friends'), which is already
 * RLS/visibility-scoped) within RADIUS_KM of an anchor becomes a row linking
 * to that place's feed. A place matching several anchors shows once, tagged
 * with its closest anchor.
 */

const RADIUS_KM = 50

interface Anchor {
  kind: 'you' | 'pin'
  label: string
  latitude: number
  longitude: number
}

interface NearbyMatch {
  slug: string
  name: string
  country_code: string | null
  friendCount: number
  albumCount: number
  distanceKm: number
  anchor: Anchor
}

export function FriendsNearby() {
  const { places: friendPlaces, loading: placesLoading } = usePlaces('friends')
  const { items: wishlistItems } = useWishlist()

  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const anchors = useMemo<Anchor[]>(() => {
    const list: Anchor[] = []
    if (position) {
      list.push({ kind: 'you', label: 'you', ...position })
    }
    for (const item of wishlistItems) {
      if (item.latitude == null || item.longitude == null) continue
      list.push({
        kind: 'pin',
        label: getCityName(item.location_name) || item.location_name,
        latitude: item.latitude,
        longitude: item.longitude,
      })
    }
    return list
  }, [position, wishlistItems])

  const matches = useMemo<NearbyMatch[]>(() => {
    if (anchors.length === 0) return []
    const out: NearbyMatch[] = []
    for (const place of friendPlaces) {
      if (place.latitude == null || place.longitude == null) continue
      let best: { anchor: Anchor; distanceKm: number } | null = null
      for (const anchor of anchors) {
        const d = haversineKm(anchor.latitude, anchor.longitude, place.latitude, place.longitude)
        if (d <= RADIUS_KM && (!best || d < best.distanceKm)) {
          best = { anchor, distanceKm: d }
        }
      }
      if (best) {
        out.push({
          slug: place.slug,
          name: place.name,
          country_code: place.country_code,
          friendCount: place.contributorIds.length,
          albumCount: place.albumCount,
          distanceKm: best.distanceKm,
          anchor: best.anchor,
        })
      }
    }
    // Closest first; current-position matches ahead of pin matches at a tie.
    return out
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6)
  }, [anchors, friendPlaces])

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateError('Location is not available in this browser')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        log.warn('FriendsNearby geolocation denied/failed', {
          component: 'FriendsNearby',
          action: 'locate',
          error: err.message,
        })
        setLocateError('Could not get your location')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  // Nothing to anchor against and nothing to offer — stay out of the way.
  // (Still render when the user could add the "near me now" anchor.)
  if (placesLoading || friendPlaces.length === 0) return null

  const hasPinAnchors = anchors.some((a) => a.kind === 'pin')
  if (matches.length === 0 && !hasPinAnchors && !position && !locating && !locateError) {
    // No wishlist pins: the strip is a single quiet "near me" affordance.
    return (
      <div className="mt-5">
        <NearMeButton locating={locating} onClick={requestLocation} />
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Friends who have been nearby"
      className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-resting)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" />
          Friends have been near
        </h2>
        {!position && <NearMeButton locating={locating} onClick={requestLocation} compact />}
      </div>

      {locateError && (
        <p className="mt-2 text-xs text-muted-foreground">{locateError}</p>
      )}

      {matches.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {position
            ? `No friend adventures within ${RADIUS_KM} km of you or your pinned spots yet.`
            : `No friend adventures within ${RADIUS_KM} km of your pinned spots yet.`}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {matches.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/places/${m.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none shrink-0">
                    {m.country_code ? getFlagEmoji(m.country_code) : '📍'}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                    {getCityName(m.name) || m.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m.friendCount} {m.friendCount === 1 ? 'friend' : 'friends'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {m.anchor.kind === 'you' ? (
                    <>
                      <MapPin className="h-3 w-3" />
                      {m.distanceKm < 1 ? '<1 km' : formatDistanceKm(Math.round(m.distanceKm))} from you
                    </>
                  ) : (
                    <>
                      <Star className="h-3 w-3" />
                      near {m.anchor.label}
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}

function NearMeButton({
  locating,
  onClick,
  compact = false,
}: {
  locating: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {locating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LocateFixed className="h-3.5 w-3.5" />
      )}
      {compact ? 'Near me now' : 'See if friends have been near you'}
    </button>
  )
}
