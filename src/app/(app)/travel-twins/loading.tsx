import { Skeleton } from '@/components/ui/skeleton'

export default function TravelTwinsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Skeleton className="h-8 w-44 mb-2" />
      <Skeleton className="h-4 w-64 max-w-full mb-6" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
