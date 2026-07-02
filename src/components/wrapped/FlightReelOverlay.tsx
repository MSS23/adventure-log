'use client'

/**
 * FlightReelOverlay — the cinematic narrator of the Wrapped experience.
 *
 * As the camera flies between locations on the globe, this overlay presents
 * a film-strip-style album card for the destination the plane is currently
 * arriving at. Cross-fades on each segment change. Includes a plane icon
 * that swoops in to suggest "you've landed."
 *
 * Sits on top of the globe canvas, lower-third, doesn't capture pointer
 * events so the underlying globe can still be interacted with.
 */

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Plane, Calendar, MapPin } from 'lucide-react'
import { getFlagEmoji } from '@/lib/utils/country'
import { parseLocalDate } from '@/lib/utils/travel-date'

interface ReelLocation {
  lat: number
  lng: number
  name: string
  date: string
  albumId?: string
  coverUrl?: string
  albumTitle?: string
  country?: string
}

interface FlightReelOverlayProps {
  /** Sorted locations being flown through. */
  locations: ReelLocation[]
  /**
   * Index of the segment currently being flown — the card shown is the
   * arrival, i.e. locations[segmentIndex + 1]. Pass -1 before the first
   * segment starts.
   */
  segmentIndex: number
  /** 0..1 — fraction of the journey completed across all segments. */
  progress: number
}

function formatDate(iso: string): string {
  const d = parseLocalDate(iso)
  if (!d) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FlightReelOverlay({ locations, segmentIndex, progress }: FlightReelOverlayProps) {
  // The card showcases the *arrival* — the destination of the current arc.
  // Before the first arc starts, segmentIndex is -1 and we show the first
  // location (so the screen isn't empty as the camera settles).
  const activeIdx = Math.max(0, Math.min(segmentIndex + 1, locations.length - 1))
  const active = locations[activeIdx]
  const total = locations.length

  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-4 sm:bottom-32">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.albumId ?? `${active.lat},${active.lng}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto w-full max-w-[14rem] sm:max-w-md"
        >
          {/* Compact on mobile (max-w-[14rem]) so the card stays in the lower
              third and doesn't cover the globe pins; full filmic size from sm up. */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-lg backdrop-blur-xl">
            {/* Cover image (or fallback gradient). 16:10 keeps it filmic. */}
            <div className="relative aspect-[16/9] sm:aspect-[16/10] bg-gradient-to-br from-olive-700/40 via-black to-coral-700/30">
              {active.coverUrl ? (
                <Image
                  src={active.coverUrl}
                  alt={active.albumTitle ?? active.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 28rem"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/40">
                  <MapPin className="h-12 w-12" aria-hidden />
                </div>
              )}
              {/* Bottom darkening so the title chip below is always legible. */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Plane chrome — flies in from the left with a subtle bob,
                  cues "the plane just landed." Re-animates on each card swap
                  because the AnimatePresence key changes. */}
              <motion.div
                initial={{ opacity: 0, x: -60, y: -10, rotate: -5 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-3 top-3"
              >
                <div className="flex items-center gap-1.5 rounded-full bg-coral-600/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg">
                  <Plane className="h-3 w-3 -rotate-12" aria-hidden />
                  Arrived
                </div>
              </motion.div>

              {/* Segment counter — tells the user where they are in the reel. */}
              <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/85 backdrop-blur">
                {activeIdx + 1} / {total}
              </div>
            </div>

            {/* Caption strip */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="line-clamp-1 font-heading text-lg font-bold tracking-tight text-white sm:text-xl">
                  {active.albumTitle ?? active.name}
                </h3>
                {active.country && (
                  <span aria-hidden className="text-base">
                    {getFlagEmoji(active.country ?? '')}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {active.name}
                </span>
                {active.date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden />
                    {formatDate(active.date)}
                  </span>
                )}
              </div>

              {/* Reel progress bar — fills as the whole journey progresses,
                  not just the current segment. Distinct from the per-segment
                  progress bar at top of the page. */}
              <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-olive-400 via-coral-400 to-coral-300"
                  animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
