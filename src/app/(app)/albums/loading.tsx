export default function AlbumsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="h-10 w-28 bg-olive-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#111111] rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-olive-100 dark:bg-white/[0.05] animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-3 w-3 bg-olive-100 dark:bg-white/[0.05] rounded-full animate-pulse" />
                <div className="h-3 w-16 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
