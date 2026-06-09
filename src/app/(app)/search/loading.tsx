export default function SearchLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="h-11 w-full bg-olive-100 dark:bg-white/[0.05] rounded-xl animate-pulse mb-6" />

      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-2.5 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
