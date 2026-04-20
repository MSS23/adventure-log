'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, X } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

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
        const res = await fetch('/api/memories')
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
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30 overflow-hidden">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            On this day
          </h3>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300"
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
            className="flex-shrink-0 w-44 group"
          >
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-900/40">
              {memory.cover_photo_url && (
                <Image
                  src={getPhotoUrl(memory.cover_photo_url) || ''}
                  alt={memory.title}
                  fill
                  sizes="176px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-90">
                  {memory.years_ago} {memory.years_ago === 1 ? 'year' : 'years'} ago
                </div>
                <div className="text-sm font-semibold line-clamp-1">{memory.title}</div>
                {memory.location_name && (
                  <div className="text-[11px] opacity-80 line-clamp-1">{memory.location_name}</div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
