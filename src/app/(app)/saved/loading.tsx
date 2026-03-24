import { AlbumGridSkeleton } from '@/components/ui/skeleton-screens'

export default function SavedLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="animate-pulse bg-stone-200 dark:bg-stone-800 rounded-lg h-7 w-32" />
      <AlbumGridSkeleton />
    </div>
  )
}
