'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GlobeInstance } from '@/types/globe'
import { latLngToGlobeXYZ } from '@/lib/utils/geoCalculations'
import { createAirplaneModel, disposeAirplaneModel } from './createAirplaneModel'

export interface FlightState {
  isFlying: boolean
  lat: number
  lng: number
  altitude: number
  heading: number
  pitch: number
  bank: number
}

interface FlightAnimationProps {
  globe: GlobeInstance | null
  airplaneState: FlightState | null
  isActive: boolean
  airplaneScale?: number
}

function toVector(lat: number, lng: number, altitude: number): THREE.Vector3 {
  const { x, y, z } = latLngToGlobeXYZ(lat, lng, altitude)
  return new THREE.Vector3(x, y, z)
}

/** Imperative in-scene aircraft: React never rebuilds the mesh per frame. */
export function FlightAnimation({
  globe,
  airplaneState,
  isActive,
  airplaneScale = 0.62,
}: FlightAnimationProps) {
  const airplaneRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!globe || !isActive) return

    const airplane = createAirplaneModel()
    airplane.visible = false
    globe.scene().add(airplane)
    airplaneRef.current = airplane

    return () => {
      globe.scene().remove(airplane)
      disposeAirplaneModel(airplane)
      if (airplaneRef.current === airplane) airplaneRef.current = null
    }
  }, [globe, isActive])

  useEffect(() => {
    const airplane = airplaneRef.current
    if (!airplane || !airplaneState?.isFlying) {
      if (airplane) airplane.visible = false
      return
    }

    const altitude = Math.max(0.01, airplaneState.altitude)
    const position = toVector(airplaneState.lat, airplaneState.lng, altitude)
    airplane.position.copy(position)

    // Build a tangent heading from local north/east vectors. This keeps the
    // aircraft flush with the globe and prevents the old cone from pointing
    // into the planet or drifting away from the visible route.
    const radialUp = position.clone().normalize()
    const north = toVector(
      Math.min(89.99, airplaneState.lat + 0.1),
      airplaneState.lng,
      altitude,
    ).sub(position).projectOnPlane(radialUp).normalize()
    const east = toVector(
      airplaneState.lat,
      airplaneState.lng + 0.1,
      altitude,
    ).sub(position).projectOnPlane(radialUp).normalize()
    const heading = THREE.MathUtils.degToRad(airplaneState.heading)
    const forward = north.multiplyScalar(Math.cos(heading))
      .add(east.multiplyScalar(Math.sin(heading)))
      .normalize()

    airplane.up.copy(radialUp)
    airplane.lookAt(position.clone().add(forward))
    airplane.rotateZ(THREE.MathUtils.degToRad(-airplaneState.bank))
    airplane.rotateX(THREE.MathUtils.degToRad(airplaneState.pitch * 0.35))
    airplane.scale.setScalar(airplaneScale)
    airplane.visible = true
  }, [airplaneState, airplaneScale])

  return null
}
