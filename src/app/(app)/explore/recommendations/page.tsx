'use client'

import { useMemo, useState } from 'react'
import { MapPinned, Plus, Compass, MapPin } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  useRecommendations,
  useRecommendationCities,
} from '@/lib/hooks/usePlaceRecommendations'
import { RecommendationCard } from '@/components/recommendations/RecommendationCard'
import {
  RecommendationFilters,
  type RecommendationFilterState,
} from '@/components/recommendations/RecommendationFilters'
import { CreateRecommendationModal } from '@/components/recommendations/CreateRecommendationModal'

function RecommendationSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-5 dark:bg-white/[0.03] dark:border-white/[0.08]">
      <div className="h-[60px] w-[44px] shrink-0 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-black/[0.05] dark:bg-white/[0.05]" />
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  const reduceMotion = useReducedMotion()
  const [modalOpen, setModalOpen] = useState(false)
  const [filters, setFilters] = useState<RecommendationFilterState>({ sort: 'top' })

  const { data: cities } = useRecommendationCities()
  const {
    data: recommendations,
    isLoading,
    isError,
    refetch,
  } = useRecommendations({
    city: filters.city,
    countryCode: filters.countryCode,
    type: filters.type,
    q: filters.q,
    sort: filters.sort,
  })

  // Lead with a handful of the busiest destinations for quick browsing.
  const topCities = useMemo(
    () => (cities || []).slice(0, 8),
    [cities]
  )

  const hasResults = (recommendations?.length ?? 0) > 0

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-6">
        <p className="al-eyebrow text-[color:var(--color-muted-warm)]">Pre-trip research</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-[26px] font-semibold leading-tight text-[color:var(--color-ink)] dark:text-stone-100 sm:text-[30px]">
              Recommendations
            </h1>
            <p className="mt-1 max-w-prose text-[14px] text-[color:var(--color-ink-soft)] dark:text-stone-400">
              Community tips for your next trip. The places fellow travelers bump rise to the
              top, so the best spots for a destination surface first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="al-btn-accent inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-[14px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)] dark:focus-visible:ring-offset-[#1A140E]"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            New recommendation
          </button>
        </div>
      </header>

      {/* Browse by destination */}
      {topCities.length > 0 && (
        <section className="mb-6" aria-label="Browse by destination">
          <div className="mb-2 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[color:var(--color-muted-warm)]" strokeWidth={1.8} aria-hidden />
            <span className="al-eyebrow text-[color:var(--color-muted-warm)]">Browse by destination</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topCities.map((c) => {
              const selected =
                filters.city === c.city && filters.countryCode === (c.country_code || undefined)
              return (
                <button
                  key={`${c.city}-${c.country_code ?? ''}`}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      city: selected ? undefined : c.city,
                      countryCode: selected ? undefined : c.country_code || undefined,
                    }))
                  }
                  aria-pressed={selected}
                  className={cn(
                    'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)] dark:focus-visible:ring-offset-[#1A140E]',
                    selected
                      ? 'bg-[color:var(--color-forest)] text-[color:var(--color-ivory)]'
                      : 'bg-white text-[color:var(--color-ink-soft)] ring-1 ring-[color:var(--color-line-warm)] hover:bg-black/[0.03] dark:bg-white/[0.04] dark:text-stone-300 dark:ring-white/[0.1]'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  {c.city}
                  {c.country_code ? `, ${c.country_code}` : ''}
                  <span className="rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums dark:bg-white/10">
                    {c.count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="mb-5">
        <RecommendationFilters value={filters} onChange={setFilters} />
      </div>

      {/* List */}
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? 'Loading recommendations…'
          : isError
            ? 'Could not load recommendations.'
            : `${recommendations?.length ?? 0} recommendation${(recommendations?.length ?? 0) === 1 ? '' : 's'} found`}
      </p>
      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading recommendations">
          <RecommendationSkeleton />
          <RecommendationSkeleton />
          <RecommendationSkeleton />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-8 text-center dark:bg-white/[0.03] dark:border-white/[0.08]">
          <p className="text-[14px] text-[color:var(--color-ink-soft)] dark:text-stone-300">
            We couldn&apos;t load recommendations.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-[color:var(--color-forest)] px-4 text-[13px] font-semibold text-[color:var(--color-ivory)]"
          >
            Try again
          </button>
        </div>
      ) : hasResults ? (
        <motion.ul
          className="space-y-3"
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {recommendations!.map((rec) => (
            <motion.li
              key={rec.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <RecommendationCard recommendation={rec} />
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-10 text-center dark:bg-white/[0.02] dark:border-white/[0.12]">
          <span
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-forest)]/10 text-[color:var(--color-forest)]"
            aria-hidden
          >
            <MapPinned className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="font-heading text-[17px] font-semibold text-[color:var(--color-ink)] dark:text-stone-100">
            {filters.city || filters.q || filters.type
              ? 'No tips match yet'
              : 'No recommendations yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-[color:var(--color-ink-soft)] dark:text-stone-400">
            {filters.city || filters.q || filters.type
              ? 'Try clearing a filter — or be the first to add a tip here.'
              : 'Be the first to share a great place for your fellow travelers.'}
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="al-btn-accent mx-auto mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            Add a recommendation
          </button>
        </div>
      )}

      <CreateRecommendationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultCity={filters.city}
        defaultCountryCode={filters.countryCode}
      />
    </div>
  )
}
