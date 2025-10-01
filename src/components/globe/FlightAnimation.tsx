'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GlobeInstance } from '@/types/globe'

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

    // Interpolate position
    const lat = fromLat + (toLat - fromLat) * progress
    const lng = fromLng + (toLng - fromLng) * progress
    const alt = altitude * 0.01 // Convert to globe units

    // Convert lat/lng to 3D coordinates
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    const radius = 100 + alt * 100

    const x = -radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)

    if (airplaneRef.current) {
      airplaneRef.current.position.set(x, y, z)
      airplaneRef.current.lookAt(0, 0, 0)
      airplaneRef.current.scale.set(airplaneScale, airplaneScale, airplaneScale)
    }

  }, [globe, airplaneState, isActive, airplaneScale, trailColor])

  return null
}
