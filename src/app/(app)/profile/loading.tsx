export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Avatar and name */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
        <div className="space-y-3 flex-1">
          <div className="h-7 w-40 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-56 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-6 w-10 mx-auto bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-14 mx-auto bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Album grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-olive-100 dark:bg-white/[0.05] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
