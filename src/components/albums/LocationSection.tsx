'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

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
    <div className={cn("bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4", className)}>
      {/* Location Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Location</h2>
        <p className="text-sm text-gray-600">{location}</p>
      </div>

      {/* Static Map Container */}
      <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
        {/* Static map image with location marker */}
        <Image
          src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s-marker+14b8a6(${longitude},${latitude})/${longitude},${latitude},8,0/600x400@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'}`}
          alt={`Map of ${location}`}
          fill
          className="object-cover"
          unoptimized
        />
        {/* Location name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="h-4 w-4" />
            <span className="font-medium text-sm">{location}</span>
          </div>
        </div>
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
