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

    // Point camera at location with closer zoom to show region clearly
    // Lower altitude = closer view (1.5 is good for showing the region)
    globe.pointOfView({
      lat: latitude,
      lng: longitude,
      altitude: 1.5 // Closer view to show the region with pin clearly visible
    }, 1000)

    // Set controls to allow user interaction but prevent issues
    const controls = globe.controls()
    if (controls) {
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.5
      controls.minDistance = 150
      controls.maxDistance = 400
    }
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

  // Create a marker point for the album location with maximum visibility
  const markerData = [{
    lat: latitude,
    lng: longitude,
    size: 5.0, // Larger marker for better visibility
    color: '#ef4444', // Bright red for maximum contrast
    label: albumTitle
  }]

  // Create rings around the location for pulsing effect
  const ringsData = [{
    lat: latitude,
    lng: longitude,
    maxR: 10, // Larger rings for better visibility
    propagationSpeed: 1.5,
    repeatPeriod: 1200
  }]

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-blue-50 to-indigo-100">
      <Globe
        ref={globeRef}
        width={undefined}
        height={undefined}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl={null}
        backgroundColor="rgba(239, 246, 255, 1)" // Light blue background for visibility

        // Points layer for location marker - enhanced visibility
        pointsData={markerData}
        pointAltitude={0.1} // Higher altitude for better visibility above surface
        pointRadius="size"
        pointColor="color"
        pointResolution={16} // Smoother point rendering
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

        // Rings layer for pulsing effect around location
        ringsData={ringsData}
        ringColor={() => '#ef4444'}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"

        // Atmosphere - enhanced for better visibility
        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.25}
        showAtmosphere={true}

        // Lighting - ensure globe is well-lit and visible
        showGraticules={false}

        // Controls - allow user to rotate and zoom
        enablePointerInteraction={true}

        // Animation controls - smooth entrance
        animateIn={true}

        // Render settings for better visibility
        rendererConfig={{
          antialias: true,
          alpha: true
        }}
      />

      {/* Location indicator overlay */}
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg border-2 border-red-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div className="text-sm font-semibold text-gray-900">{locationName}</div>
        </div>
      </div>
    </div>
  )
}
