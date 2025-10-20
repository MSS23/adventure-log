'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Globe with SSR disabled
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading globe...</p>
      </div>
    </div>
  )
})

interface AlbumMiniGlobeProps {
  latitude: number
  longitude: number
  locationName: string
  albumTitle: string
}

export function AlbumMiniGlobe({ latitude, longitude, locationName, albumTitle }: AlbumMiniGlobeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!globeRef.current || !isClient) return

    // Set initial view to show the location
    const globe = globeRef.current

    // Point camera at location
    globe.pointOfView({
      lat: latitude,
      lng: longitude,
      altitude: 1.5
    }, 1000)
  }, [latitude, longitude, isClient])

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading globe...</p>
        </div>
      </div>
    )
  }

  // Create a marker point for the album location
  const markerData = [{
    lat: latitude,
    lng: longitude,
    size: 0.5,
    color: '#2563eb',
    label: albumTitle
  }]

  return (
    <div className="w-full h-full relative">
      <Globe
        ref={globeRef}
        width={undefined}
        height={undefined}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl={null}

        // Points layer for location marker
        pointsData={markerData}
        pointAltitude={0.01}
        pointRadius="size"
        pointColor="color"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLabel={(d: any) => `
          <div style="
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              ${d.label}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${locationName}
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; font-family: monospace;">
              ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
            </div>
          </div>
        `}

        // Atmosphere
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}

        // Controls
        enablePointerInteraction={true}

        // Animation controls
        animateIn={true}
      />
    </div>
  )
}
