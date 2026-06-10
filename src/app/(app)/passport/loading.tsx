import { Skeleton } from '@/components/ui/skeleton'

export default function PassportLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Passport card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6 mb-8">
        {/* Coverage ring placeholder */}
        <Skeleton className="w-32 h-32 mx-auto rounded-full" />

        {/* Name */}
        <Skeleton className="h-6 w-40 mx-auto" />
        <Skeleton className="h-4 w-28 mx-auto" />

        {/* Continent progress */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Country strip */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-10 h-7 shrink-0" />
        ))}
      </div>
    </div>
  );
}
