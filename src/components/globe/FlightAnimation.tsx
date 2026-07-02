'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GlobeInstance } from '@/types/globe'
import { gcInterpolate, latLngToGlobeXYZ } from '@/lib/utils/geoCalculations'

export interface FlightState {
  isFlying: boolean
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  progress: number
  altitude: number
}

interface FlightAnimationProps {
  globe: GlobeInstance | null
  airplaneState: FlightState | null
  isActive: boolean
  trailColor?: string
  airplaneScale?: number
}

export function FlightAnimation({
  globe,
  airplaneState,
  isActive,
  trailColor = '#00ff88',
  airplaneScale = 0.005
}: FlightAnimationProps) {
  const airplaneRef = useRef<THREE.Mesh | null>(null)
  const trailRef = useRef<THREE.Line | null>(null)

  useEffect(() => {
    if (!globe || !isActive || !airplaneState?.isFlying) {
      // Cleanup
      if (airplaneRef.current && globe) {
        globe.scene().remove(airplaneRef.current)
        airplaneRef.current = null
      }
      if (trailRef.current && globe) {
        globe.scene().remove(trailRef.current)
        trailRef.current = null
      }
      return
    }

    // Simple airplane visualization using a cone
    if (!airplaneRef.current) {
      const geometry = new THREE.ConeGeometry(5, 20, 8)
      const material = new THREE.MeshBasicMaterial({ color: 0xff6b35 })
      airplaneRef.current = new THREE.Mesh(geometry, material)
      globe.scene().add(airplaneRef.current)
    }

    // Update airplane position based on flight state
    const { fromLat, fromLng, toLat, toLng, progress, altitude } = airplaneState

    // Ride the great circle (matching the rendered arc) — linear lat/lng
    // interpolation cuts the corner on long routes and drifts off the arc.
    const { lat, lng } = gcInterpolate(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
      progress
    )
    const alt = altitude * 0.01 // Convert to globe units

    const { x, y, z } = latLngToGlobeXYZ(lat, lng, alt)

    if (airplaneRef.current) {
      airplaneRef.current.position.set(x, y, z)
      airplaneRef.current.lookAt(0, 0, 0)
      airplaneRef.current.scale.set(airplaneScale, airplaneScale, airplaneScale)
    }

  }, [globe, airplaneState, isActive, airplaneScale, trailColor])

  return null
}
