'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Dynamically import the mini globe to avoid SSR issues
const AlbumMiniGlobe = dynamic(
  () => import('@/components/globe/AlbumMiniGlobe').then(mod => mod.AlbumMiniGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-64 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
)

interface LocationSectionProps {
  location: string
  latitude: number
  longitude: number
  albumTitle: string
  countryCode?: string
  className?: string
}

export function LocationSection({
  location,
  latitude,
  longitude,
  albumTitle,
  countryCode,
  className
}: LocationSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Location Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MapPin className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-600">{location}</p>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <AlbumMiniGlobe
          latitude={latitude}
          longitude={longitude}
          locationName={location}
          albumTitle={albumTitle}
        />
      </div>

      {/* Location Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          {countryCode && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Country Code</span>
              <span className="font-medium text-gray-900">{countryCode}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Coordinates</span>
            <code className="px-2 py-1 bg-white rounded text-xs font-mono text-gray-700 border border-gray-200">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
