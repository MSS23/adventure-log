export default function OrganizeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="h-10 w-28 bg-olive-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-olive-100 dark:bg-white/[0.05] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
