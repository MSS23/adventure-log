'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const EnhancedGlobe = dynamic(() => import('@/components/globe/EnhancedGlobe').then(mod => ({ default: mod.EnhancedGlobe })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-lg text-gray-600 font-medium">Loading Globe Experience...</p>
        <p className="text-sm text-gray-500 max-w-md text-center">
          Preparing your interactive world map with travel locations and flight animations
        </p>
      </div>
    </div>
  )
})

export default function GlobePage() {
  const searchParams = useSearchParams()
  const albumId = searchParams.get('album')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const userId = searchParams.get('user')

  // Create a stable key to prevent unnecessary Globe re-creation
  // This key only changes when the filter user changes, not on every render
  const globeKey = useMemo(() => `globe-${userId || 'main'}`, [userId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 overflow-y-auto">
      <EnhancedGlobe
        key={globeKey}
        initialAlbumId={albumId || undefined}
        initialLat={lat ? parseFloat(lat) : undefined}
        initialLng={lng ? parseFloat(lng) : undefined}
        filterUserId={userId || undefined}
      />
    </div>
  )
}