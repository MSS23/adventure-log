export default function ActivityLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-8 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />

      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-2.5 w-20 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
