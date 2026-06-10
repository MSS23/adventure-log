import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {[1, 2, 3].map((section) => (
        <div key={section} className="mb-8 space-y-4">
          <Skeleton className="h-3 w-28" />
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
