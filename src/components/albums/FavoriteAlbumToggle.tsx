'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { log } from '@/lib/utils/logger'

interface FavoriteAlbumToggleProps {
  albumId: string
  /** Current favourite state. A missing/undefined value is treated as false. */
  initialFavorite?: boolean
  /** Optional callback so the parent can sync its own album state. */
  onChange?: (next: boolean) => void
  className?: string
}

/**
 * Owner-only star toggle for marking an album as a favourite (migration 60).
 *
 * Render this ONLY when the viewer owns the album — it has no permission
 * gating of its own and relies on the caller plus the DB owner UPDATE policy.
 *
 * Behaviour:
 *  - Optimistic UI: flips immediately, reverts on failure.
 *  - Persists via supabase.from('albums').update({ is_favorite }).
 *  - Degrades gracefully if the `is_favorite` column doesn't exist yet
 *    (pre-migration): shows a friendly toast instead of crashing.
 */
export function FavoriteAlbumToggle({
  albumId,
  initialFavorite,
  onChange,
  className,
}: FavoriteAlbumToggleProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(!!initialFavorite)
  const [pending, setPending] = useState(false)
  const supabase = createClient()

  const handleToggle = async () => {
    if (pending) return

    const next = !isFavorite
    // Optimistic update
    setIsFavorite(next)
    setPending(true)
    onChange?.(next)

    try {
      const { error } = await supabase
        .from('albums')
        .update({ is_favorite: next })
        .eq('id', albumId)

      if (error) throw error

      toast.success(next ? 'Added to highlights' : 'Removed from highlights', {
        duration: 2000,
        position: 'bottom-center',
      })
    } catch (err) {
      // Revert optimistic update
      setIsFavorite(!next)
      onChange?.(!next)

      // Postgres "column does not exist" => migration 60 not applied yet.
      const code = (err as { code?: string })?.code
      const message = (err as { message?: string })?.message ?? ''
      const columnMissing = code === '42703' || /is_favorite/.test(message)

      log.error(
        'Failed to toggle album favourite',
        { component: 'FavoriteAlbumToggle', action: 'toggle', albumId },
        err instanceof Error ? err : new Error(String(err)),
      )

      toast.error(
        columnMissing
          ? 'Highlights aren’t available yet'
          : 'Failed to update highlight',
        { duration: 3000, position: 'bottom-center' },
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Remove album from highlights' : 'Highlight this album'}
      title={isFavorite ? 'Highlighted' : 'Highlight this album'}
      onClick={handleToggle}
      disabled={pending}
      className={cn(
        'transition-all duration-200 cursor-pointer active:scale-[0.97] rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60',
        isFavorite
          ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300'
          : 'text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400',
        className,
      )}
    >
      <Star className={cn('h-5 w-5', isFavorite && 'fill-current')} />
    </button>
  )
}
