import { Skeleton } from '@/components/ui/skeleton'

export default function AlbumDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Hero cover */}
      <Skeleton className="aspect-[21/9] w-full rounded-2xl" />

      {/* Title and meta */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`rounded-xl ${
              i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
