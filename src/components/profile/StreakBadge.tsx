'use client'

import { Flame } from 'lucide-react'
import { useStreak } from '@/lib/hooks/useStreak'

/**
 * Small compact streak pill — shows current streak with a flame emoji.
 * Silent when streak is 0. Used in passport, profile, dashboard.
 */
export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { current, longest, loading } = useStreak()

  if (loading || current === 0) return null

  const label = current === 1 ? 'day' : 'days'

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{
          background: 'var(--color-coral-tint)',
          color: 'var(--color-stamp)',
          border: '1px solid var(--color-coral)',
        }}
      >
        <Flame className="h-3 w-3" />
        {current}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: 'var(--color-coral-tint)',
        border: '1px solid var(--color-coral)',
      }}
    >
      <Flame className="h-4 w-4" style={{ color: 'var(--color-coral)' }} />
      <div className="leading-tight">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--color-stamp)' }}>
          {current} {label}
        </div>
        <div
          className="font-mono text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--color-muted-warm)' }}
        >
          {longest > current ? `Best ${longest}` : 'On a roll'}
        </div>
      </div>
    </div>
  )
}
