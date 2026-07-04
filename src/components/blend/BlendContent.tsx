'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Plane,
  Sparkles,
  Globe2,
  Loader2,
  Lock,
  Compass,
  Heart,
  ArrowRight,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { log } from '@/lib/utils/logger'
import type { User } from '@/types/database'
import { PUBLIC_USER_COLUMNS } from '@/lib/constants/user-columns'

/**
 * BLEND % FORMULA
 * ───────────────
 * Core score is the Jaccard similarity of each traveler's set of visited
 * country codes (uppercased + de-duped), expressed as a percentage:
 *
 *     blend = round( shared.length / max(1, union.length) * 100 )
 *
 * where `shared` is the intersection of country codes and `union` is the
 * combined set. This is fully explainable: "of all the countries either of
 * you has visited, X% have been visited by both."
 *
 * No bonus terms are applied — keeping the headline number identical to what
 * the formula above produces means a viewer can always reconstruct it from
 * the Shared / Combined counts shown on the page. (Shared cities are surfaced
 * separately as colour, not folded into the score.)
 */

// There are 195 widely-recognised sovereign countries (193 UN members + 2
// observer states). Used for the "% of the world" stat on the union.
const WORLD_COUNTRY_COUNT = 195

// A lightweight album shape — only the fields the blend needs. `is_favorite`
// is optional because the column is being added in parallel; absence must not
// crash the blend (it simply yields zero favourites).
interface BlendAlbum {
  id: string
  title: string
  country_code: string | null
  cover_photo_url: string | null
  is_favorite?: boolean | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; reason: string }
  | { status: 'not-found' }
  | { status: 'self' }
  | { status: 'private'; otherName: string }
  | { status: 'ready'; data: BlendData }

interface PersonSummary {
  id: string
  name: string
  username: string
  avatarUrl: string | undefined
  countryCodes: string[]
  favourites: BlendAlbum[]
}

interface BlendData {
  viewer: PersonSummary
  other: PersonSummary
  blendPct: number
  shared: string[] // intersection of country codes
  union: string[] // combined country codes
  viewerOnly: string[] // viewer's unique codes
  otherOnly: string[] // other's unique codes
  worldPct: number
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Uppercase + de-dupe country codes from a set of albums. */
function codesOf(albums: BlendAlbum[]): string[] {
  return [
    ...new Set(
      albums
        .map((a) => a.country_code?.toUpperCase().trim())
        .filter((c): c is string => !!c && c.length === 2),
    ),
  ]
}

/** Favourites = albums explicitly flagged is_favorite. Safe if column absent. */
function favouritesOf(albums: BlendAlbum[]): BlendAlbum[] {
  return albums.filter((a) => a.is_favorite === true)
}

export function BlendContent({ username }: { username: string }) {
  const { user: currentUser, profile, authLoading } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      setState({ status: 'error', reason: 'Sign in to see your Travel Blend.' })
      return
    }
    if (!username) {
      setState({ status: 'not-found' })
      return
    }

    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      try {
        setState({ status: 'loading' })

        // 1. Resolve the other traveler by username (or UUID fallback).
        // Cross-user read: explicit safe columns only — select('*') is
        // permission-denied once migration 75 locks down the PII columns.
        const otherQuery = UUID_RE.test(username)
          ? supabase.from('users').select(PUBLIC_USER_COLUMNS).eq('id', username).maybeSingle()
          : supabase
              .from('users')
              .select(PUBLIC_USER_COLUMNS)
              .ilike('username', username)
              .maybeSingle()

        const { data: otherUser, error: otherErr } =
          (await otherQuery) as { data: User | null; error: unknown }

        if (otherErr) throw otherErr
        if (!otherUser) {
          if (!cancelled) setState({ status: 'not-found' })
          return
        }

        // Blending with yourself isn't meaningful.
        if (otherUser.id === currentUser.id) {
          if (!cancelled) setState({ status: 'self' })
          return
        }

        const otherName = getDisplayName(
          otherUser.display_name,
          otherUser.username,
        )

        // 2. Fetch both users' albums. RLS lets the viewer read their own
        //    albums and the other user's viewable albums (public, or
        //    follower-readable — they're mutual followers after a QR scan).
        //    We select is_favorite defensively: if the column doesn't exist
        //    yet, that query errors, so we retry without it.
        const selectWithFav =
          'id, title, country_code, cover_photo_url, is_favorite'
        const selectNoFav = 'id, title, country_code, cover_photo_url'

        const fetchAlbums = async (userId: string): Promise<BlendAlbum[]> => {
          // First attempt includes is_favorite. If the column doesn't exist
          // yet (42703) the select errors, so we gracefully retry without it.
          const withFav = await supabase
            .from('albums')
            .select(selectWithFav)
            .eq('user_id', userId)
            .neq('status', 'draft')

          if (!withFav.error) {
            return (withFav.data as unknown as BlendAlbum[] | null) ?? []
          }

          const noFav = await supabase
            .from('albums')
            .select(selectNoFav)
            .eq('user_id', userId)
            .neq('status', 'draft')

          if (noFav.error) throw noFav.error
          return (noFav.data as unknown as BlendAlbum[] | null) ?? []
        }

        const [viewerAlbums, otherAlbums] = await Promise.all([
          fetchAlbums(currentUser.id),
          fetchAlbums(otherUser.id),
        ])

        // If the other user is private/not-followed, RLS returns an empty set
        // even though the user row resolved. Treat "user has zero readable
        // albums but is non-public" as a friendly can't-blend-yet state.
        const otherPrivacy =
          otherUser.privacy_level || (otherUser.is_private ? 'private' : 'public')
        if (otherAlbums.length === 0 && otherPrivacy !== 'public') {
          if (!cancelled) setState({ status: 'private', otherName })
          return
        }

        // 3. Compute the blend.
        const viewerCodes = codesOf(viewerAlbums)
        const otherCodes = codesOf(otherAlbums)

        const viewerSet = new Set(viewerCodes)
        const otherSet = new Set(otherCodes)

        const shared = viewerCodes.filter((c) => otherSet.has(c)).sort()
        const union = [...new Set([...viewerCodes, ...otherCodes])].sort()
        const viewerOnly = viewerCodes.filter((c) => !otherSet.has(c)).sort()
        const otherOnly = otherCodes.filter((c) => !viewerSet.has(c)).sort()

        const blendPct = Math.round(
          (shared.length / Math.max(1, union.length)) * 100,
        )
        const worldPct = Math.round((union.length / WORLD_COUNTRY_COUNT) * 100)

        const viewerName =
          getDisplayName(profile?.display_name, profile?.username) || 'You'

        const data: BlendData = {
          viewer: {
            id: currentUser.id,
            name: viewerName,
            username: profile?.username || '',
            avatarUrl: getAvatarUrl(profile?.avatar_url, profile?.username),
            countryCodes: viewerCodes,
            favourites: favouritesOf(viewerAlbums).slice(0, 4),
          },
          other: {
            id: otherUser.id,
            name: otherName,
            username: otherUser.username || '',
            avatarUrl: getAvatarUrl(otherUser.avatar_url, otherUser.username),
            countryCodes: otherCodes,
            favourites: favouritesOf(otherAlbums).slice(0, 4),
          },
          blendPct,
          shared,
          union,
          viewerOnly,
          otherOnly,
          worldPct,
        }

        if (!cancelled) setState({ status: 'ready', data })
      } catch (error) {
        log.error(
          'Failed to compute Travel Blend',
          { component: 'BlendContent', action: 'compute', username },
          error as Error,
        )
        if (!cancelled)
          setState({
            status: 'error',
            reason: "We couldn't build this blend right now.",
          })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, currentUser, profile, username])

  // ───────── Loading ─────────
  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--color-coral)]" />
      </div>
    )
  }

  // ───────── Friendly fallbacks ─────────
  if (
    state.status === 'error' ||
    state.status === 'not-found' ||
    state.status === 'self' ||
    state.status === 'private'
  ) {
    const copy =
      state.status === 'not-found'
        ? "We couldn't find that traveler."
        : state.status === 'self'
          ? "That's you! Find another traveler to blend with."
          : state.status === 'private'
            ? `${state.otherName}'s adventures are private. Follow them and get accepted to blend your journeys.`
            : state.reason

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[color:var(--color-coral)]/10 text-[color:var(--color-coral)]">
            {state.status === 'private' ? (
              <Lock className="size-6" />
            ) : (
              <Compass className="size-6" />
            )}
          </div>
          <h1 className="al-display text-2xl mb-2">Can&apos;t blend yet</h1>
          <p className="text-sm text-muted-foreground mb-6">{copy}</p>
          <Button asChild variant="coral" size="pill" className="rounded-full">
            <Link href="/explore">Explore travelers</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <BlendView data={state.data} />
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Presentational                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function BlendView({ data }: { data: BlendData }) {
  const {
    viewer,
    other,
    blendPct,
    shared,
    union,
    viewerOnly,
    otherOnly,
    worldPct,
  } = data

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
        {/* ───────── Hero: two avatars + blend ring ───────── */}
        <motion.section
          className="overflow-hidden rounded-3xl border border-[color:var(--color-coral)]/25 bg-gradient-to-br from-[color:var(--color-coral)]/10 via-card to-[color:var(--color-gold)]/10 p-6 sm:p-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="al-eyebrow text-[10px] mb-5 inline-flex items-center gap-1.5">
            <Sparkles className="size-3 text-[color:var(--color-coral)]" />
            Travel Blend
          </p>

          {/* Two travelers joined by a flight path */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6">
            <PersonAvatar person={viewer} self />
            <div className="relative flex-1 max-w-[120px] flex items-center justify-center">
              <div className="h-px w-full border-t-2 border-dashed border-[color:var(--color-coral)]/40" />
              <motion.span
                className="absolute flex size-7 items-center justify-center rounded-full bg-[color:var(--color-coral)] text-white shadow-md"
                initial={{ left: '0%', opacity: 0 }}
                animate={{ left: '100%', opacity: 1 }}
                transition={{ delay: 0.4, duration: 1.1, ease: 'easeInOut' }}
                style={{ transform: 'translateX(-50%)' }}
              >
                <Plane className="size-3.5 -rotate-12" />
              </motion.span>
            </div>
            <PersonAvatar person={other} />
          </div>

          {/* Blend % ring */}
          <BlendRing pct={blendPct} />

          <h1 className="al-display text-2xl sm:text-3xl mt-5 leading-tight">
            You and{' '}
            <span className="text-[color:var(--color-coral)]">
              {other.name}
            </span>{' '}
            are{' '}
            <span className="text-[color:var(--color-coral)]">
              {blendPct}% blended
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            Of the {union.length}{' '}
            {union.length === 1 ? 'country' : 'countries'} either of you has
            explored, {shared.length} {shared.length === 1 ? 'is' : 'are'}{' '}
            shared.
          </p>
        </motion.section>

        {/* ───────── Combined countries (union + world %) ───────── */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] shrink-0">
              <Globe2 className="size-5" />
            </div>
            <div>
              <p className="al-eyebrow text-[10px]">Combined countries</p>
              <p className="al-display text-2xl leading-none mt-0.5">
                {union.length}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  together
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{worldPct}% of the world</span>
              <span>{union.length} / {WORLD_COUNTRY_COUNT}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-coral)] to-[color:var(--color-gold)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, worldPct)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          </div>
        </section>

        {/* ───────── Shared countries ───────── */}
        <CountrySection
          eyebrow="Countries you've both explored"
          title={`${shared.length} ${shared.length === 1 ? 'country' : 'countries'} in common`}
          codes={shared}
          accent="coral"
          emptyText="No shared countries yet — your paths haven't crossed."
        />

        {/* ───────── Different countries ───────── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <UniqueCard
            heading={`Only ${viewer.name}`}
            subtitle="Your solo stamps"
            codes={viewerOnly}
            accent="coral"
          />
          <UniqueCard
            heading={`Only ${other.name}`}
            subtitle="Their solo stamps"
            codes={otherOnly}
            accent="olive"
          />
        </section>

        {/* ───────── Favourite trips ───────── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <FavouritesCard person={viewer} self />
          <FavouritesCard person={other} />
        </section>

        {/* ───────── View each other's journeys ───────── */}
        <section className="grid gap-3 sm:grid-cols-2">
          <JourneyLink
            href="/passport"
            label={`${viewer.name}'s journey`}
            sub="Your passport & globe"
          />
          <JourneyLink
            href={other.username ? `/u/${other.username}/passport` : '/explore'}
            label={`${other.name}'s journey`}
            sub="Their passport & globe"
          />
        </section>
      </div>
    </div>
  )
}

function PersonAvatar({
  person,
  self = false,
}: {
  person: PersonSummary
  self?: boolean
}) {
  return (
    <Avatar className="size-14 sm:size-16 ring-2 ring-background shadow-sm">
      <AvatarImage src={person.avatarUrl} alt={person.name} />
      <AvatarFallback
        className={
          self
            ? 'bg-primary/15 text-primary text-base font-semibold'
            : 'bg-olive-200 text-olive-800 text-base font-semibold'
        }
      >
        {getDisplayInitial(person.name, undefined)}
      </AvatarFallback>
    </Avatar>
  )
}

function BlendRing({ pct }: { pct: number }) {
  const size = 132
  const stroke = 11
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Travel blend score: ${pct} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="var(--color-coral)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="al-display text-4xl leading-none tabular-nums">
          {pct}
          <span className="text-xl align-top">%</span>
        </span>
        <span className="al-caption mt-0.5">blend</span>
      </div>
    </div>
  )
}

function CountrySection({
  eyebrow,
  title,
  codes,
  accent,
  emptyText,
}: {
  eyebrow: string
  title: string
  codes: string[]
  accent: 'coral' | 'gold'
  emptyText: string
}) {
  const borderClass =
    accent === 'coral'
      ? 'border-[color:var(--color-coral)]/25'
      : 'border-[color:var(--color-gold)]/25'

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="al-eyebrow text-[10px] mb-1">{eyebrow}</p>
      <h2 className="al-display text-xl mb-4">{title}</h2>
      {codes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {codes.map((code, i) => (
            <motion.span
              key={code}
              className={`flex items-center gap-1.5 rounded-full border ${borderClass} bg-background/70 px-3 py-1.5`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: Math.min(i * 0.03, 0.5),
                type: 'spring',
                stiffness: 220,
                damping: 16,
              }}
            >
              <span className="text-lg leading-none">{getFlagEmoji(code)}</span>
              <span className="text-xs font-semibold text-foreground">
                {getCountryName(code)}
              </span>
            </motion.span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </section>
  )
}

function UniqueCard({
  heading,
  subtitle,
  codes,
  accent,
}: {
  heading: string
  subtitle: string
  codes: string[]
  accent: 'coral' | 'olive'
}) {
  const dot =
    accent === 'coral'
      ? 'bg-[color:var(--color-coral)]'
      : 'bg-olive-500'

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <div className="min-w-0">
          <p className="font-heading font-semibold text-sm text-foreground truncate">
            {heading}
          </p>
          <p className="al-caption">
            {subtitle} · {codes.length}
          </p>
        </div>
      </div>
      {codes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <span
              key={code}
              className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1"
              title={getCountryName(code)}
            >
              <span className="text-base leading-none">
                {getFlagEmoji(code)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {getCountryName(code)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No countries here they haven&apos;t also visited.
        </p>
      )}
    </div>
  )
}

function FavouritesCard({
  person,
  self = false,
}: {
  person: PersonSummary
  self?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Heart
          className="size-4 text-[color:var(--color-coral)]"
          fill="currentColor"
        />
        <p className="font-heading font-semibold text-sm text-foreground">
          {self ? 'Your' : `${person.name}'s`} favourite albums
        </p>
      </div>
      {person.favourites.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {person.favourites.map((album) => {
            const cover = getPhotoUrl(album.cover_photo_url ?? undefined)
            return (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl block bg-muted border border-border transition-all duration-200 hover:border-[color:var(--color-coral)]/40 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt={album.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Compass className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                />
                <p className="absolute bottom-0 left-0 right-0 p-2 text-[11px] font-semibold text-white line-clamp-2 drop-shadow-sm">
                  {album.title}
                </p>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {self
            ? "You haven't starred any favourite trips yet."
            : `${person.name} hasn't starred any favourites yet.`}
        </p>
      )}
    </div>
  )
}

function JourneyLink({
  href,
  label,
  sub,
}: {
  href: string
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-[color:var(--color-coral)]/40 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="block font-heading font-semibold text-sm text-foreground truncate">
          {label}
        </span>
        <span className="block al-caption">{sub}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--color-coral)]" />
    </Link>
  )
}
