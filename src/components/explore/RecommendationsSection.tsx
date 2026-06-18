'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { MapPinned, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecommendations } from '@/lib/hooks/usePlaceRecommendations'
import { RecommendationCard } from '@/components/recommendations/RecommendationCard'

interface RecommendationsSectionProps {
  className?: string
  /** How many of the top recommendations to preview. */
  limit?: number
}

function PreviewSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-5 dark:bg-white/[0.03] dark:border-white/[0.08]">
      <div className="h-[60px] w-[44px] shrink-0 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-black/[0.05] dark:bg-white/[0.05]" />
      </div>
    </div>
  )
}

/**
 * Compact "top recommendations" preview for the Explore discovery surface.
 * The full browse + create experience lives at /explore/recommendations.
 */
export function RecommendationsSection({ className, limit = 3 }: RecommendationsSectionProps) {
  const reduceMotion = useReducedMotion()
  const { data, isLoading, isError } = useRecommendations({ sort: 'top' })

  const top = useMemo(() => (data || []).slice(0, limit), [data, limit])

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading recommendations">
        {Array.from({ length: limit }).map((_, i) => (
          <PreviewSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Discovery surface: stay quiet on error rather than shouting on the Explore feed.
  if (isError || top.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center rounded-2xl border border-dashed border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] px-6 py-10 text-center dark:bg-white/[0.02] dark:border-white/[0.12]',
          className
        )}
      >
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-forest)]/10 text-[color:var(--color-forest)]"
          aria-hidden
        >
          <MapPinned className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <p className="font-heading text-[16px] font-semibold text-[color:var(--color-ink)] dark:text-stone-100">
          No recommendations yet
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-[color:var(--color-ink-soft)] dark:text-stone-400">
          Share a great place to eat, see, or stay — the ones fellow travelers bump rise to the top.
        </p>
        <Link
          href="/explore/recommendations"
          className="al-btn-accent mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
          Add a recommendation
        </Link>
      </div>
    )
  }

  return (
    <motion.ul
      className={cn('space-y-3', className)}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
    >
      {top.map((rec) => (
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
  )
}
