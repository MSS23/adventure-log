'use client'

import { Check, ChevronUp, MapPin } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToggleBump, useToggleRecommendationCompletion } from '@/lib/hooks/usePlaceRecommendations'
import { getDisplayInitial } from '@/lib/utils/display-name'
import { PLACE_TYPE_CONFIG } from './place-type'
import type { PlaceRecommendation } from '@/types/database'

interface RecommendationCardProps {
  recommendation: PlaceRecommendation
}

/** Resolve the creator profile across the type's relation aliases. */
function getCreator(rec: PlaceRecommendation) {
  return rec.user || rec.users || rec.profiles
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const reduceMotion = useReducedMotion()
  const toggleBump = useToggleBump()
  const toggleCompletion = useToggleRecommendationCompletion()
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const config = PLACE_TYPE_CONFIG[recommendation.place_type]
  const TypeIcon = config.icon
  const creator = getCreator(recommendation)
  const bumped = !!recommendation.has_bumped
  const completed = !!recommendation.has_completed

  const creatorName =
    creator?.display_name || creator?.username || 'A traveler'
  const avatarUrl = getPhotoUrl(creator?.avatar_url, 'avatars')
  const creatorInitial = getDisplayInitial(creatorName, undefined)

  const locationLabel = [recommendation.city, recommendation.country_code]
    .filter(Boolean)
    .join(' · ')

  const handleBump = () => {
    // Public research tool: a logged-out visitor can browse but must sign in to
    // bump. Send them to login with a redirect back to where they were.
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname || '/explore/recommendations')}`)
      return
    }
    if (toggleBump.isPending) return
    toggleBump.mutate({ id: recommendation.id })
  }

  const handleCompletion = () => {
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname || '/explore/recommendations')}`)
      return
    }
    if (!toggleCompletion.isPending) toggleCompletion.mutate({ id: recommendation.id })
  }

  return (
    <article
      className={cn(
        'flex gap-3 rounded-2xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-4 sm:gap-4 sm:p-5',
        'shadow-[0_1px_2px_rgba(26,20,14,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(26,20,14,0.08)]',
        'dark:bg-white/[0.03] dark:border-white/[0.08]'
      )}
    >
      {/* Bump control — prominent, vertical, the core interaction */}
      <div className="flex flex-col items-center pt-0.5">
        <motion.button
          type="button"
          onClick={handleBump}
          aria-pressed={bumped}
          aria-label={
            bumped
              ? `Remove your bump from ${recommendation.title}. ${recommendation.bump_count} bumps`
              : `Bump ${recommendation.title}. ${recommendation.bump_count} bumps`
          }
          disabled={toggleBump.isPending}
          aria-busy={toggleBump.isPending}
          title={user ? undefined : 'Sign in to bump'}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          className={cn(
            'group flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5',
            'border transition-colors duration-200 outline-none',
            'focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)] dark:focus-visible:ring-offset-[#1A140E]',
            bumped
              ? 'border-[color:var(--color-coral)] bg-[color:var(--color-coral)] text-white shadow-[0_4px_12px_rgba(226,85,58,0.28)]'
              : 'border-[color:var(--color-line-warm)] bg-white text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-coral)]/50 hover:text-[color:var(--color-coral)] dark:bg-white/[0.04] dark:border-white/[0.1] dark:text-stone-300'
          )}
        >
          <ChevronUp
            className={cn(
              'h-5 w-5 transition-transform duration-200',
              !bumped && !reduceMotion && 'group-hover:-translate-y-0.5'
            )}
            strokeWidth={2.4}
            aria-hidden
          />
          <span className="text-[13px] font-bold tabular-nums leading-none">
            {recommendation.bump_count}
          </span>
        </motion.button>
        <span className="mt-1 text-[9.5px] font-mono uppercase tracking-[0.08em] text-[color:var(--color-muted-warm)]">
          {recommendation.bump_count === 1 ? 'bump' : 'bumps'}
        </span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]',
              config.badge
            )}
          >
            <TypeIcon className="h-3 w-3" strokeWidth={2} aria-hidden />
            {config.label}
          </span>
          {locationLabel && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-muted-warm)]">
              <MapPin className="h-3 w-3" strokeWidth={1.8} aria-hidden />
              {locationLabel}
            </span>
          )}
        </div>

        <h3 className="mt-2 font-heading text-[16px] font-semibold leading-snug text-[color:var(--color-ink)] dark:text-stone-100">
          {recommendation.title}
        </h3>

        {recommendation.tip && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--color-ink-soft)] dark:text-stone-300">
            {recommendation.tip}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Creator */}
          <div className="flex items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover ring-1 ring-[color:var(--color-line-warm)] dark:ring-white/10"
              loading="lazy"
            />
          ) : (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[10px] font-semibold text-[color:var(--color-ivory)]"
              aria-hidden
            >
              {creatorInitial}
            </span>
          )}
          <span className="text-[12px] text-[color:var(--color-muted-warm)]">
            Recommended by{' '}
            <span className="font-medium text-[color:var(--color-ink-soft)] dark:text-stone-300">
              {creatorName}
            </span>
          </span>
          </div>
          <button
            type="button"
            onClick={handleCompletion}
            disabled={toggleCompletion.isPending}
            aria-pressed={completed}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40',
              completed
                ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)] text-white'
                : 'border-[color:var(--color-line-warm)] bg-white text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-forest)]/40 hover:text-[color:var(--color-forest)] dark:bg-white/[0.04] dark:border-white/[0.1]'
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {completed ? 'Done' : 'I did this'}
            {(recommendation.completion_count || 0) > 0 && (
              <span className="tabular-nums opacity-75">{recommendation.completion_count}</span>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
