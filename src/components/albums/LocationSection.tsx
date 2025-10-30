'use client'

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
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>

      {/* Static Map Container */}
      <div className="relative w-full h-[250px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
        <Image
          src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s-marker+ef4444(${longitude},${latitude})/${longitude},${latitude},12,0/800x500@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'}`}
          alt={`Map of ${location}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    </div>
  )
}
