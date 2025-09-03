import { Card, CardContent } from "@/components/ui/card";

export default function AlbumsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-10 w-32" />
        </div>
        <div className="skeleton h-4 w-64" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-6 w-12" />
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="skeleton w-8 h-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            {/* Album Cover Image */}
            <div className="skeleton h-48 w-full" />

            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Album Title */}
                <div className="skeleton h-5 w-3/4" />

                {/* Location */}
                <div className="flex items-center space-x-2">
                  <div className="skeleton w-4 h-4 rounded" />
                  <div className="skeleton h-4 w-2/3" />
                </div>

                {/* Date and Photos Count */}
                <div className="flex items-center justify-between">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-3 w-12" />
                </div>

                {/* Tags */}
                <div className="flex items-center space-x-2">
                  <div className="skeleton h-5 w-12 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <div className="skeleton h-8 w-16" />
                  <div className="skeleton h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button Skeleton */}
      <div className="flex justify-center mt-8">
        <div className="skeleton h-10 w-32" />
      </div>
    </div>
  );
}
