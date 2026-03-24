import { FeedSkeleton } from '@/components/ui/skeleton-screens'

export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <FeedSkeleton />
    </div>
  )
}
