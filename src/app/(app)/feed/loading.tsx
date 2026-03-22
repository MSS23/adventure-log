export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-[#111111] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-28 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-2.5 w-20 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
          <div className="aspect-[4/3] bg-olive-100 dark:bg-white/[0.05] animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            <div className="flex gap-4 pt-2">
              <div className="h-8 w-16 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-8 w-16 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
