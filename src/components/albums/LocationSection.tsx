'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { MapPin, Globe2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
  // Use the public Mapbox token as fallback if env var is not set
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

  // Check if coordinates are valid (not 0,0 or missing)
  const hasValidCoordinates = latitude !== 0 && longitude !== 0 && latitude !== null && longitude !== null

  // Format coordinates for display
  const formatCoordinate = (value: number, type: 'lat' | 'lng') => {
    const absolute = Math.abs(value)
    const direction = type === 'lat'
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W')
    return `${absolute.toFixed(4)}°${direction}`
  }

  return (
    <Card className={cn("bg-white shadow-lg border-0", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Location</h3>
        </div>

        {/* Location Name */}
        {location && (
          <div className="mb-4">
            <p className="text-gray-900 font-medium text-base">{location}</p>
            {countryCode && (
              <div className="flex items-center gap-1 mt-1">
                <Globe2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Country Code: {countryCode.toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        {/* Coordinates - only show if valid */}
        {hasValidCoordinates && (
          <div className="text-sm text-gray-600 mb-4 font-mono">
            {formatCoordinate(latitude, 'lat')}, {formatCoordinate(longitude, 'lng')}
          </div>
        )}

        {/* Static Map Container - only show if we have valid coordinates */}
        {hasValidCoordinates ? (
          <div className="relative w-full h-[280px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            {/* Map placeholder/loader while image loads */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>

            {/* Actual map image */}
            <Image
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-marker+ef4444(${longitude},${latitude})/${longitude},${latitude},13,0/600x400@2x?access_token=${mapboxToken}`}
              alt={`Map showing ${location || albumTitle}`}
              fill
              className="object-cover z-10"
              sizes="(max-width: 768px) 100vw, 600px"
              priority
              onError={(e) => {
                // If map fails to load, show a fallback
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        ) : (
          // No coordinates available message
          <div className="w-full h-[200px] rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Map coordinates not available</p>
              {location && (
                <p className="text-xs text-gray-400 mt-1">Location: {location}</p>
              )}
            </div>
          </div>
        )}

        {/* Interactive link to full map (optional) - only show if coordinates valid */}
        {hasValidCoordinates && (
          <div className="mt-4">
            <a
              href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=13`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              View on OpenStreetMap
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
