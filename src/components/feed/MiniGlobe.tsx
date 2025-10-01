'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin } from 'lucide-react'

// Dynamically import Globe with no SSR
const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
    </div>
  )
})

interface MiniGlobeProps {
  latitude: number
  longitude: number
  location?: string
  className?: string
}

export function MiniGlobe({ latitude, longitude, location, className = '' }: MiniGlobeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !globeRef.current) return

    const setPosition = () => {
      try {
        const globe = globeRef.current
        if (!globe) return

        // Position camera to look directly at the pin location
        globe.pointOfView({
          lat: latitude,
          lng: longitude,
          altitude: 1.8
        }, 0)

        // Disable rotation to keep pin always visible
        const controls = globe.controls()
        if (controls) {
          controls.enableZoom = false
          controls.enablePan = false
          controls.enableRotate = false
          controls.autoRotate = false
        }
      } catch (err) {
        console.warn('Globe positioning error:', err)
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setPosition()

      // Retry positioning with longer delays to ensure globe is fully rendered
      const timers = [100, 300, 600, 1000, 1500, 2000, 2500].map(delay =>
        setTimeout(setPosition, delay)
      )

      return () => timers.forEach(t => clearTimeout(t))
    })

    // Cleanup function
    return () => {}
  }, [mounted, latitude, longitude])

  if (!mounted) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  const pinData = [
    {
      lat: latitude,
      lng: longitude,
      size: 1.2,
      color: '#ef4444',
      label: location || ''
    }
  ]

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <GlobeGL
        ref={globeRef}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(248,250,252,1)"

        // Force position when globe is ready - this is the key event
        onGlobeReady={() => {
          if (globeRef.current) {
            // Set position immediately when ready
            globeRef.current.pointOfView({ lat: latitude, lng: longitude, altitude: 1.8 }, 0)

            // Also disable controls immediately
            const controls = globeRef.current.controls()
            if (controls) {
              controls.enableZoom = false
              controls.enablePan = false
              controls.enableRotate = false
              controls.autoRotate = false
            }

            // Set again after a short delay to be sure
            setTimeout(() => {
              if (globeRef.current) {
                globeRef.current.pointOfView({ lat: latitude, lng: longitude, altitude: 1.8 }, 0)
              }
            }, 100)
          }
        }}

        // Custom HTML markers for fancy pins
        htmlElementsData={pinData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        htmlElement={(d: any) => {
          const el = document.createElement('div')
          el.innerHTML = `
            <div style="
              position: relative;
              width: 48px;
              height: 60px;
              cursor: pointer;
              transform: translate(-50%, -100%);
              z-index: 1000;
            ">
              <svg viewBox="0 0 24 24" width="48" height="60" style="
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
              ">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      fill="#ef4444"
                      stroke="#7f1d1d"
                      stroke-width="1.5"/>
                <circle cx="12" cy="9" r="4" fill="#fee2e2"/>
                <circle cx="12" cy="9" r="2" fill="#991b1b"/>
              </svg>
              <div style="
                position: absolute;
                top: 35%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 12px;
                height: 12px;
                background: white;
                border: 2px solid #991b1b;
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
              "></div>
            </div>
            <style>
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1);
                  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                }
                50% {
                  opacity: 0.8;
                  transform: translate(-50%, -50%) scale(1.3);
                  box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
              }
            </style>
          `
          return el
        }}

        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.15}
        enablePointerInteraction={false}
        animateIn={false}
        waitForGlobeReady={false}
        width={400}
        height={400}
      />

      {location && (
        <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-md px-2 py-1.5 shadow-sm border border-gray-200">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-900 truncate">{location}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
