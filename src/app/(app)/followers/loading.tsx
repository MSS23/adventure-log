import { Skeleton } from '@/components/ui/skeleton'

export default function FollowersLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-11 w-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
