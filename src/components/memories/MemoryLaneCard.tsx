'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, X } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'

interface Memory {
  id: string
  title: string
  location_name: string | null
  country_code: string | null
  date_start: string
  cover_photo_url: string | null
  years_ago: number
}

export function MemoryLaneCard() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/memories')
        const data = await res.json()
        if (res.ok) setMemories(data.memories || [])
      } catch (error) {
        log.error('Failed to load memories', { component: 'MemoryLaneCard' }, error as Error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading || dismissed || memories.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="font-heading text-sm font-semibold text-foreground">
            On this day
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-10 w-10 -m-1.5 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 pb-4 flex gap-3 overflow-x-auto">
        {memories.map((memory) => (
          <Link
            key={memory.id}
            href={`/albums/${memory.id}`}
            className="flex-shrink-0 w-44 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          >
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              {memory.cover_photo_url && (
                <Image
                  src={getPhotoUrl(memory.cover_photo_url) || ''}
                  alt={memory.title}
                  fill
                  sizes="176px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-white/90">
                  {memory.years_ago} {memory.years_ago === 1 ? 'year' : 'years'} ago
                </div>
                <div className="text-sm font-semibold line-clamp-1 drop-shadow-sm">{memory.title}</div>
                {memory.location_name && (
                  <div className="text-[11px] text-white/90 line-clamp-1">{memory.location_name}</div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
