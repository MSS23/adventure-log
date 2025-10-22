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
  const globeRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Cleanup function to dispose WebGL context when unmounting
    return () => {
      if (globeRef.current) {
        try {
          // Access the underlying renderer and dispose it
          const globe = globeRef.current
          if (globe.renderer && typeof globe.renderer === 'function') {
            const renderer = globe.renderer()
            if (renderer && renderer.dispose) {
              renderer.dispose()
            }
          }
        } catch (err) {
          console.warn('Error disposing MiniGlobe:', err)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted || !globeRef.current) return

    const setPosition = () => {
      try {
        const globe = globeRef.current
        if (!globe) return

        // Position camera to look directly at the pin location with proper altitude to see full globe
        globe.pointOfView({
          lat: latitude,
          lng: longitude,
          altitude: 2.5
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
    const rafId = requestAnimationFrame(() => {
      setPosition()
    })

    // Retry positioning with longer delays to ensure globe is fully rendered
    const timers = [100, 300, 600, 1000, 1500, 2000, 2500].map(delay =>
      setTimeout(() => setPosition(), delay)
    )

    // Cleanup function
    return () => {
      cancelAnimationFrame(rafId)
      timers.forEach(t => clearTimeout(t))
    }
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
            // Set position immediately when ready with proper altitude to see full globe
            globeRef.current.pointOfView({ lat: latitude, lng: longitude, altitude: 2.5 }, 0)

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
                globeRef.current.pointOfView({ lat: latitude, lng: longitude, altitude: 2.5 }, 0)
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
              width: 70px;
              height: 80px;
              cursor: pointer;
              transform: translate(-50%, -100%);
              z-index: 1000;
              filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
            ">
              <!-- Outer Glow Ring -->
              <div style="
                position: absolute;
                bottom: 25px;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 107, 107, 0.4) 0%, transparent 70%);
                animation: glowPulse 3s ease-in-out infinite;
                z-index: 0;
              "></div>

              <!-- Main Pin Body with 3D Effect -->
              <div style="
                position: absolute;
                bottom: 8px;
                left: 50%;
                width: 44px;
                height: 56px;
                background: linear-gradient(145deg,
                  #ff6b6b 0%,
                  #ee5a6f 25%,
                  #f06595 50%,
                  #d946a6 75%,
                  #c026d3 100%);
                border-radius: 50% 50% 50% 0;
                transform: translateX(-50%) rotate(-45deg);
                box-shadow:
                  0 15px 35px rgba(239, 68, 68, 0.5),
                  0 8px 15px rgba(0, 0, 0, 0.4),
                  inset -3px -3px 8px rgba(0, 0, 0, 0.3),
                  inset 3px 3px 8px rgba(255, 255, 255, 0.4);
                animation: bounce 2.5s ease-in-out infinite;
                z-index: 2;
              "></div>

              <!-- Pin Tip Highlight -->
              <div style="
                position: absolute;
                bottom: 8px;
                left: 50%;
                width: 10px;
                height: 10px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, transparent 100%);
                border-radius: 50% 50% 50% 0;
                transform: translateX(-50%) rotate(-45deg);
                z-index: 3;
              "></div>

              <!-- Inner Circle with Glass Effect -->
              <div style="
                position: absolute;
                bottom: 27px;
                left: 50%;
                transform: translateX(-50%);
                width: 24px;
                height: 24px;
                background:
                  radial-gradient(circle at 35% 35%,
                    rgba(255, 255, 255, 1) 0%,
                    rgba(255, 255, 255, 0.8) 15%,
                    rgba(255, 224, 224, 0.9) 30%,
                    rgba(255, 107, 107, 0.95) 60%,
                    rgba(238, 90, 111, 1) 100%);
                border-radius: 50%;
                border: 3px solid rgba(255, 255, 255, 1);
                box-shadow:
                  0 0 15px rgba(255, 255, 255, 0.8),
                  0 0 25px rgba(255, 107, 107, 0.6),
                  inset 0 -2px 6px rgba(0, 0, 0, 0.2),
                  inset 2px 2px 6px rgba(255, 255, 255, 0.9);
                z-index: 4;
                animation: shimmer 3s ease-in-out infinite;
              "></div>

              <!-- Sparkle Effect -->
              <div style="
                position: absolute;
                bottom: 35px;
                left: 45%;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                box-shadow: 0 0 8px rgba(255, 255, 255, 1);
                animation: sparkle 2s ease-in-out infinite;
                z-index: 5;
              "></div>

              <!-- Pulsing Wave Rings -->
              <div style="
                position: absolute;
                bottom: 27px;
                left: 50%;
                transform: translateX(-50%);
                width: 24px;
                height: 24px;
                border: 4px solid rgba(255, 107, 107, 0.8);
                border-radius: 50%;
                animation: waveRing 2.5s ease-out infinite;
                z-index: 1;
              "></div>

              <div style="
                position: absolute;
                bottom: 27px;
                left: 50%;
                transform: translateX(-50%);
                width: 24px;
                height: 24px;
                border: 4px solid rgba(240, 101, 149, 0.6);
                border-radius: 50%;
                animation: waveRing 2.5s ease-out infinite 0.5s;
                z-index: 1;
              "></div>

              <!-- Animated Shadow -->
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 12px;
                background: radial-gradient(ellipse, rgba(0, 0, 0, 0.5) 0%, transparent 70%);
                border-radius: 50%;
                animation: shadowPulse 2.5s ease-in-out infinite;
                z-index: 0;
              "></div>
            </div>
            <style>
              @keyframes bounce {
                0%, 100% {
                  transform: translateX(-50%) rotate(-45deg) translateY(0);
                }
                50% {
                  transform: translateX(-50%) rotate(-45deg) translateY(-12px);
                }
              }

              @keyframes waveRing {
                0% {
                  opacity: 1;
                  transform: translateX(-50%) scale(1);
                }
                100% {
                  opacity: 0;
                  transform: translateX(-50%) scale(2.5);
                }
              }

              @keyframes glowPulse {
                0%, 100% {
                  opacity: 0.6;
                  transform: translateX(-50%) scale(1);
                }
                50% {
                  opacity: 1;
                  transform: translateX(-50%) scale(1.3);
                }
              }

              @keyframes shadowPulse {
                0%, 100% {
                  opacity: 0.5;
                  transform: translateX(-50%) scale(1);
                }
                50% {
                  opacity: 0.7;
                  transform: translateX(-50%) scale(1.3);
                }
              }

              @keyframes shimmer {
                0%, 100% {
                  box-shadow:
                    0 0 15px rgba(255, 255, 255, 0.8),
                    0 0 25px rgba(255, 107, 107, 0.6),
                    inset 0 -2px 6px rgba(0, 0, 0, 0.2),
                    inset 2px 2px 6px rgba(255, 255, 255, 0.9);
                }
                50% {
                  box-shadow:
                    0 0 20px rgba(255, 255, 255, 1),
                    0 0 35px rgba(255, 107, 107, 0.9),
                    inset 0 -2px 6px rgba(0, 0, 0, 0.2),
                    inset 2px 2px 8px rgba(255, 255, 255, 1);
                }
              }

              @keyframes sparkle {
                0%, 100% {
                  opacity: 0;
                  transform: scale(0);
                }
                50% {
                  opacity: 1;
                  transform: scale(1);
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
