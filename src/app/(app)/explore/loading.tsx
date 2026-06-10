import { Skeleton } from '@/components/ui/skeleton'

export default function ExploreLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-24 md:pb-8 pt-6 md:pt-8">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      {/* Search pill */}
      <Skeleton className="h-12 w-full rounded-full mb-8" />

      <div className="space-y-8">
        {/* Featured destination */}
        <Skeleton className="h-[240px] sm:h-[320px] w-full rounded-2xl" />

        {/* Card grid */}
        <div>
          <Skeleton className="h-6 w-44 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* List rows */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
