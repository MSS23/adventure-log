export default function AnalyticsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="h-8 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-4 space-y-2">
            <div className="h-3 w-20 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            <div className="h-8 w-16 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111111] rounded-xl p-4">
          <div className="h-4 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-48 bg-olive-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
        </div>
        <div className="bg-white dark:bg-[#111111] rounded-xl p-4">
          <div className="h-4 w-36 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="h-48 bg-olive-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
