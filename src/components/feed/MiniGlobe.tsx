'use client'

import { useEffect, useRef, useState, memo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Loader2, MapPin, Globe, Expand } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

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

        // Position camera to show full globe with pin clearly visible
        globe.pointOfView({
          lat: latitude,
          lng: longitude,
          altitude: 3.0
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
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="#f8fafc"

        // Lighting settings to make the globe visible
        showAtmosphere={true}
        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.2}

        // Force position when globe is ready - this is the key event
        onGlobeReady={() => {
          if (globeRef.current) {
            // Set position immediately when ready to show full globe
            globeRef.current.pointOfView({
              lat: latitude,
              lng: longitude,
              altitude: 3.0
            }, 0)

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
                globeRef.current.pointOfView({
                  lat: latitude,
                  lng: longitude,
                  altitude: 3.0
                }, 0)
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

// Compact globe icon that links to full globe view - for feed cards
interface CompactGlobeLinkProps {
  lat: number
  lng: number
  albumId?: string
  userId?: string
  location?: string
  countryCode?: string
  className?: string
}

export const CompactGlobeLink = memo(function CompactGlobeLink({
  lat,
  lng,
  albumId,
  userId,
  location,
  countryCode,
  className
}: CompactGlobeLinkProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // Country code to flag emoji
  const getFlag = (code: string) => {
    return code
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('')
  }

  const globeUrl = albumId
    ? `/globe?album=${albumId}&lat=${lat}&lng=${lng}${userId ? `&user=${userId}` : ''}`
    : `/globe?lat=${lat}&lng=${lng}`

  // On mobile, navigate to album page instead of globe (globe doesn't work well on small screens)
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth < 768 && albumId) {
      e.preventDefault()
      router.push(`/albums/${albumId}`)
    }
  }, [albumId, router])

  return (
    <Link
      href={globeUrl}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-gradient-to-r from-teal-50 to-cyan-50',
        'border border-teal-200/50',
        'text-sm text-teal-700 hover:text-teal-800',
        'transition-all duration-200',
        'hover:shadow-md hover:shadow-teal-100 hover:border-teal-300',
        'group',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated globe icon */}
      <motion.div
        animate={!prefersReducedMotion && isHovered ? { rotate: 360 } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="relative"
      >
        <Globe className="w-4 h-4 text-teal-600" />
        {/* Pulse dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
      </motion.div>

      {/* Flag and location */}
      {countryCode && <span className="text-base">{getFlag(countryCode)}</span>}
      {location && (
        <span className="truncate max-w-[120px] font-medium">{location}</span>
      )}

      {/* Expand icon on hover */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={isHovered ? { opacity: 1, width: 'auto' } : { opacity: 0, width: 0 }}
        className="overflow-hidden"
      >
        <Expand className="w-3.5 h-3.5 text-teal-500" />
      </motion.div>
    </Link>
  )
})

// Location badge with optional mini-globe preview
interface LocationBadgeProps {
  lat: number
  lng: number
  location: string
  albumId?: string
  userId?: string
  countryCode?: string
  className?: string
  showGlobe?: boolean
}

export const LocationBadge = memo(function LocationBadge({
  lat,
  lng,
  location,
  albumId,
  userId,
  countryCode,
  className,
  showGlobe = false
}: LocationBadgeProps) {
  // Country code to flag emoji
  const getFlag = (code: string) => {
    return code
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('')
  }

  const linkUrl = albumId
    ? `/globe?album=${albumId}&lat=${lat}&lng=${lng}${userId ? `&user=${userId}` : ''}`
    : `/globe?lat=${lat}&lng=${lng}`

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showGlobe && (
        <Link
          href={linkUrl}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          <Globe className="w-4 h-4 text-white" />
        </Link>
      )}
      <Link
        href={linkUrl}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-600 transition-colors"
      >
        {countryCode && <span>{getFlag(countryCode)}</span>}
        <MapPin className="w-3.5 h-3.5" />
        <span className="truncate max-w-[150px]">{location}</span>
      </Link>
    </div>
  )
})
