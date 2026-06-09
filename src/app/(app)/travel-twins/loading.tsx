export default function TravelTwinsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="h-8 w-44 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-2" />
      <div className="h-4 w-64 max-w-full bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-white dark:bg-[#111111] rounded-xl"
          >
            <div className="w-12 h-12 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-48 max-w-full bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
