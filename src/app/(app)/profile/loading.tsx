import { ProfileHeaderSkeleton, AlbumGridSkeleton } from '@/components/ui/skeleton-screens'

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <ProfileHeaderSkeleton />
      <AlbumGridSkeleton />
    </div>
  )
}
