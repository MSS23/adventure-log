export default function WishlistLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="h-8 w-28 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-[#111111] rounded-xl">
            <div className="w-16 h-16 rounded-lg bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
