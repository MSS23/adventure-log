'use client'

import { Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accounts created before this date are the founding cohort — the badge is
 * computed client-side from the profile row's created_at (no table, no RPC),
 * so it works on any surface that already has the user row.
 */
export const FOUNDING_CUTOFF = '2026-12-31'

export function isFoundingExplorer(createdAt?: string | null): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  return Number.isFinite(created) && created < new Date(FOUNDING_CUTOFF).getTime()
}

/**
 * Small amber status chip for early adopters. Renders nothing when the
 * account is outside the founding cohort, so call sites can mount it
 * unconditionally next to the username.
 */
export function FoundingExplorerBadge({
  createdAt,
  className,
}: {
  createdAt?: string | null
  className?: string
}) {
  if (!isFoundingExplorer(createdAt)) return null

  return (
    <span
      title="Founding Explorer — joined in the first year"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide text-amber-700',
        className
      )}
    >
      <Compass className="h-3 w-3" aria-hidden="true" />
      Founding Explorer
    </span>
  )
}
