'use client'

import { cn } from '@/lib/utils'

export function AlbumGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Image */}
          <div className="aspect-square bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse" />

          {/* Footer */}
          <div className="flex gap-4">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-6 space-y-3">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto" />
          <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
        </div>
      ))}
    </div>
  )
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-64" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
        </div>
      </div>
    </div>
  )
}

export function GlobeLoadingSkeleton() {
  return (
    <div className="relative w-full h-[600px] bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-32 w-32 mx-auto rounded-full bg-blue-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-blue-200 rounded animate-pulse w-48 mx-auto" />
          <div className="h-3 bg-blue-200 rounded animate-pulse w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}

export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="flex items-center gap-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
