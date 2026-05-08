export default function AlbumDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hero cover */}
      <div className="aspect-[21/9] rounded-2xl bg-olive-100 dark:bg-white/[0.05] animate-pulse mb-6" />

      {/* Title and meta */}
      <div className="space-y-3 mb-8">
        <div className="h-8 w-2/3 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        </div>
        <div className="h-4 w-full bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`bg-olive-100 dark:bg-white/[0.05] rounded-lg animate-pulse ${
              i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
