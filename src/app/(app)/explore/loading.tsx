export default function ExploreLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="h-12 w-full max-w-md mx-auto bg-olive-100 dark:bg-white/[0.05] rounded-xl animate-pulse mb-8" />

      {/* Section heading */}
      <div className="h-6 w-40 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-4" />

      {/* Horizontal scroll of users */}
      <div className="flex gap-4 overflow-hidden mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-16 h-16 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse" />
            <div className="h-3 w-14 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Popular destinations heading */}
      <div className="h-6 w-48 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-4" />

      {/* Destination grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-olive-100 dark:bg-white/[0.05] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
