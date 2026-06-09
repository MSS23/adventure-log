export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="rounded-2xl bg-white dark:bg-[#111111] p-6 mb-6 space-y-3">
        <div className="h-7 w-48 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="h-4 w-72 max-w-full bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-[#111111] p-4 space-y-2">
            <div className="h-8 w-16 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-20 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-[#111111] overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-olive-100 dark:bg-white/[0.05] animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
