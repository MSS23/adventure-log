'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorRetryStateProps {
  /** Short, human title. Defaults to a generic load-failure message. */
  title?: string
  /** Optional supporting line — keep it reassuring, not technical. */
  description?: string
  /** Retry handler (e.g. React Query's refetch). Button hidden if omitted. */
  onRetry?: () => void
  retrying?: boolean
  variant?: 'default' | 'card'
  className?: string
}

/**
 * Shared "couldn't load this" state with a Retry button.
 *
 * Exists because several data pages (dashboard, saved, places, wrapped, globe)
 * swallowed query errors and fell through to their EMPTY state — telling a user
 * with albums that they have "No adventures yet". A failed load is not an empty
 * result; render this instead so the failure is honest and recoverable.
 */
export function ErrorRetryState({
  title = 'Couldn’t load this',
  description = 'Something went wrong reaching the server. Check your connection and try again.',
  onRetry,
  retrying = false,
  variant = 'default',
  className,
}: ErrorRetryStateProps) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        variant === 'card'
          ? 'rounded-2xl border border-border bg-card'
          : 'rounded-2xl border border-dashed border-border bg-muted/30',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} disabled={retrying} className="mt-5">
          <RefreshCw className={cn('mr-2 h-4 w-4', retrying && 'animate-spin')} />
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      )}
    </motion.div>
  )
}
