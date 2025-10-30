'use client'

import { Card, CardContent } from '@/components/ui/card'

interface LocationDebugProps {
  album: {
    location_name?: string
    latitude?: number | null
    longitude?: number | null
    country_code?: string | null
  }
}

export function LocationDebug({ album }: LocationDebugProps) {
  const hasLocationName = !!album.location_name
  const hasLatitude = album.latitude !== null && album.latitude !== undefined
  const hasLongitude = album.longitude !== null && album.longitude !== undefined
  const hasCountryCode = !!album.country_code
  const hasValidCoordinates = hasLatitude && hasLongitude && album.latitude !== 0 && album.longitude !== 0

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardContent className="p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Location Debug Info</h3>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex gap-2">
            <span className={hasLocationName ? 'text-green-600' : 'text-red-600'}>
              {hasLocationName ? '✓' : '✗'}
            </span>
            <span>location_name: {album.location_name || 'null'}</span>
          </div>
          <div className="flex gap-2">
            <span className={hasLatitude ? 'text-green-600' : 'text-red-600'}>
              {hasLatitude ? '✓' : '✗'}
            </span>
            <span>latitude: {album.latitude ?? 'null'}</span>
          </div>
          <div className="flex gap-2">
            <span className={hasLongitude ? 'text-green-600' : 'text-red-600'}>
              {hasLongitude ? '✓' : '✗'}
            </span>
            <span>longitude: {album.longitude ?? 'null'}</span>
          </div>
          <div className="flex gap-2">
            <span className={hasCountryCode ? 'text-green-600' : 'text-red-600'}>
              {hasCountryCode ? '✓' : '✗'}
            </span>
            <span>country_code: {album.country_code || 'null'}</span>
          </div>
          <div className="flex gap-2">
            <span className={hasValidCoordinates ? 'text-green-600' : 'text-red-600'}>
              {hasValidCoordinates ? '✓' : '✗'}
            </span>
            <span>Valid coordinates: {hasValidCoordinates ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-white rounded text-xs">
          <p className="font-semibold mb-1">Should show LocationSection:</p>
          <p>{(hasLocationName || hasLatitude || hasLongitude) ? 'YES' : 'NO'}</p>
          {!hasLocationName && !hasLatitude && !hasLongitude && (
            <p className="text-red-600 mt-1">No location data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}