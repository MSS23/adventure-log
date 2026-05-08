'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface Match {
  album_id: string
  title: string
  date_start: string | null
  distance_km: number | null
}

interface Props {
  albumId: string
  ownerUserId: string
  currentUserId: string | undefined
}

/**
 * Shows a small "You were here too" ghost badge when the viewer has
 * also logged an album at the same (or nearby) location. Silent when:
 *   - Not logged in
 *   - Viewing own album
 *   - No overlap found
 */
export function YouWereHereBadge({ albumId, ownerUserId, currentUserId }: Props) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId || currentUserId === ownerUserId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/albums/${albumId}/you-were-here`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data.match) setMatch(data.match)
      } catch (error) {
        log.error(
          'You-were-here fetch failed',
          { component: 'YouWereHereBadge' },
          error as Error
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [albumId, ownerUserId, currentUserId])

  if (loading || !match) return null

  const dateLabel = match.date_start
    ? new Date(match.date_start).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <Link
      href={`/albums/${match.album_id}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors hover:brightness-105"
      style={{
        background: 'var(--color-coral-tint)',
        color: 'var(--color-stamp)',
        border: '1px solid var(--color-coral)',
      }}
    >
      <MapPin className="h-3.5 w-3.5" />
      <span className="text-[12px] font-semibold">
        You were here too{dateLabel ? ` — ${dateLabel}` : ''}
      </span>
      <ArrowRight className="h-3 w-3 opacity-70" />
    </Link>
  )
}
