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

  // Discovery surface: stay quiet on error/empty rather than stacking a
  // billboard-sized card under the section header.
  if (isError || top.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3',
          className
        )}
      >
        <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="flex-1 text-sm text-muted-foreground">
          No recommendations yet —{' '}
          <Link href="/explore/recommendations" className="font-medium text-primary hover:underline">
            <Plus className="mb-0.5 inline h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            add the first one
          </Link>
          .
        </p>
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
