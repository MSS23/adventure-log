'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { MapPin, Globe2, AlertCircle } from 'lucide-react'
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
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Check if coordinates are valid (not 0,0 or missing)
  const hasValidCoordinates = latitude !== 0 && longitude !== 0 && latitude !== null && longitude !== null

  // Generate static map URL using OpenStreetMap tiles via StaticMap service
  // This doesn't require an API key and works reliably
  const getStaticMapUrl = () => {
    const zoom = 13
    const width = 600
    const height = 400
    // Use StaticMap.OpenStreetMap.org service (free, no API key required)
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},red-pushpin`
  }

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
      <CardContent className="p-4 sm:p-6">
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
          <div className="relative w-full h-[200px] sm:h-[240px] md:h-[280px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            {/* Map placeholder/loader while image loads */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-gray-500">Loading map...</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center px-4 max-w-sm mx-auto">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-base font-semibold text-gray-900 mb-1">Unable to load map</p>
                  <p className="text-sm text-gray-600 mb-2">Map service temporarily unavailable</p>
                  <p className="text-xs text-gray-500 font-mono bg-gray-200 rounded px-2 py-1 inline-block">
                    {formatCoordinate(latitude, 'lat')}, {formatCoordinate(longitude, 'lng')}
                  </p>
                </div>
              </div>
            )}

            {/* Actual map image */}
            {!imageError && (
              <Image
                src={getStaticMapUrl()}
                alt={`Map showing ${location || albumTitle}`}
                fill
                className={cn(
                  "object-cover transition-opacity duration-300",
                  imageLoaded ? "opacity-100 z-10" : "opacity-0"
                )}
                sizes="(max-width: 768px) 100vw, 600px"
                priority
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.error('Map image failed to load')
                  setImageError(true)
                }}
                unoptimized
              />
            )}
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
