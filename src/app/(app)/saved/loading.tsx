import { Skeleton } from '@/components/ui/skeleton'
import { AlbumGridSkeleton } from '@/components/ui/skeleton-screens'

export default function SavedLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <AlbumGridSkeleton />
    </div>
  )
}
