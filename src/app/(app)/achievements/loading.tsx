export default function AchievementsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="h-8 w-40 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#111111] rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-full bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
              <div className="h-2 w-full bg-olive-100 dark:bg-white/[0.05] rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
