'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Globe with SSR disabled
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-cyan-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-3"></div>
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

    // Point camera at location with zoomed out view to show full globe
    // Higher altitude = more zoomed out (2.5 shows full Earth)
    globe.pointOfView({
      lat: latitude,
      lng: longitude,
      altitude: 2.5 // Zoomed out to show full Earth with pin visible
    }, 1000)

    // Set controls to allow user interaction
    const controls = globe.controls()
    if (controls) {
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.5
      controls.minDistance = 200
      controls.maxDistance = 500
    }

    // Add better lighting to make globe visible
    const scene = globe.scene()
    if (scene && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const THREE = (window as any).THREE
      if (THREE) {
        // Add ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        scene.add(ambientLight)

        // Add directional light from camera position
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
        directionalLight.position.set(-1, 0.5, 1)
        scene.add(directionalLight)
      }
    }
  }, [latitude, longitude, isClient])

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-cyan-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading globe...</p>
        </div>
      </div>
    )
  }

  // Create a marker point for the album location - visible but not overwhelming
  const markerData = [{
    lat: latitude,
    lng: longitude,
    size: 1.5, // Visible marker at full globe zoom
    color: '#ef4444', // Bright red for visibility
    label: albumTitle
  }]

  // Create rings around the location for pulsing effect
  const ringsData = [{
    lat: latitude,
    lng: longitude,
    maxR: 5, // Visible rings for location indicator
    propagationSpeed: 1.5,
    repeatPeriod: 1200
  }]

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Globe
        ref={globeRef}
        width={undefined}
        height={undefined}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="rgba(15, 23, 42, 1)" // Dark background for better globe contrast

        // Points layer for location marker - visible at full globe zoom
        pointsData={markerData}
        pointAltitude={0.02} // Visible altitude above surface
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

        // Atmosphere - enhanced for better visibility on dark background
        atmosphereColor="#0d9488"
        atmosphereAltitude={0.15}
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
