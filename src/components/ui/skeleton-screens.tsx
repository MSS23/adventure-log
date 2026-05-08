'use client'

import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Base shimmer block                                                        */
/* -------------------------------------------------------------------------- */

function Shimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-stone-200 dark:bg-stone-800 rounded-lg',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Card wrapper (matches app card styling)                                    */
/* -------------------------------------------------------------------------- */

const cardClass =
  'rounded-2xl border border-stone-200 dark:border-white/[0.06] bg-white dark:bg-[#111111] overflow-hidden'

/* -------------------------------------------------------------------------- */
/*  1. AlbumCardSkeleton                                                       */
/*     Used in album grids: 4/3 image + title + subtitle + location row        */
/* -------------------------------------------------------------------------- */

export function AlbumCardSkeleton() {
  return (
    <div className={cardClass}>
      {/* Cover image */}
      <Shimmer className="aspect-[4/3] w-full rounded-none" />

      <div className="p-4 space-y-3">
        {/* Title */}
        <Shimmer className="h-4 w-3/4" />
        {/* Subtitle / date */}
        <Shimmer className="h-3.5 w-1/2" />
        {/* Location row: icon + text */}
        <div className="flex items-center gap-2 pt-1">
          <Shimmer className="h-4 w-4 rounded-full" />
          <Shimmer className="h-3 w-28" />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  2. FeedPostSkeleton                                                        */
/*     Used in feed: avatar + name, image, action bar, caption                 */
/* -------------------------------------------------------------------------- */

export function FeedPostSkeleton() {
  return (
    <div className={cardClass}>
      {/* User header */}
      <div className="flex items-center gap-3 p-4">
        <Shimmer className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Shimmer className="h-3.5 w-28" />
          <Shimmer className="h-2.5 w-20" />
        </div>
      </div>

      {/* Post image */}
      <Shimmer className="aspect-[4/3] w-full rounded-none" />

      {/* Action bar + caption */}
      <div className="p-4 space-y-3">
        {/* Action buttons row */}
        <div className="flex items-center gap-4">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>
        {/* Caption lines */}
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-2/3" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  3. ProfileHeaderSkeleton                                                   */
/*     Used on profile pages: cover, avatar, name, bio, stats bar              */
/* -------------------------------------------------------------------------- */

export function ProfileHeaderSkeleton() {
  return (
    <div className={cardClass}>
      {/* Cover photo area */}
      <Shimmer className="h-40 md:h-52 w-full rounded-none" />

      <div className="px-6 pb-6">
        {/* Avatar (overlapping cover) */}
        <div className="-mt-12 mb-4">
          <Shimmer className="h-24 w-24 rounded-full ring-4 ring-white dark:ring-[#111111]" />
        </div>

        {/* Name + username */}
        <div className="space-y-2 mb-4">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-4 w-28" />
        </div>

        {/* Bio line */}
        <Shimmer className="h-3.5 w-64 mb-5" />

        {/* Stats bar */}
        <div className="flex gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Shimmer className="h-5 w-10" />
              <Shimmer className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  4. AlbumGridSkeleton                                                       */
/*     Responsive grid of 6 AlbumCardSkeletons (1/2/3/4 cols)                  */
/* -------------------------------------------------------------------------- */

export function AlbumGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AlbumCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  5. FeedSkeleton                                                            */
/*     Stack of 3 FeedPostSkeletons                                            */
/* -------------------------------------------------------------------------- */

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  6. ExploreGridSkeleton                                                     */
/*     Section header + grid of 8 small album cards                            */
/* -------------------------------------------------------------------------- */

export function ExploreGridSkeleton() {
  return (
    <div className="space-y-8">
      {/* Search bar placeholder */}
      <Shimmer className="h-12 w-full max-w-md mx-auto rounded-xl" />

      {/* Section: Suggested users */}
      <div>
        <Shimmer className="h-5 w-40 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Shimmer className="w-16 h-16 rounded-full" />
              <Shimmer className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Section: Popular destinations */}
      <div>
        <Shimmer className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={cardClass}>
              <Shimmer className="aspect-[3/4] w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Shimmer className="h-3.5 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
