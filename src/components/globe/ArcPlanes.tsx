'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GlobeInstance } from '@/types/globe'
import type { FlightPath } from './types'
import { gcInterpolate, latLngToGlobeXYZ } from '@/lib/utils/geoCalculations'

interface ArcPlanesProps {
  globe: GlobeInstance | null
  arcs: FlightPath[]
  visible: boolean
}

function createPlaneShape(): THREE.BufferGeometry {
  // Small airplane silhouette: fuselage + wings + tail
  const shape = new THREE.Shape()

  // Fuselage (elongated)
  shape.moveTo(0, 3)       // nose
  shape.lineTo(0.4, 1)     // right of cockpit
  shape.lineTo(0.3, -0.5)  // right fuselage

  // Right wing
  shape.lineTo(2.5, -0.8)
  shape.lineTo(2.5, -1.2)
  shape.lineTo(0.3, -1.0)

  // Tail section
  shape.lineTo(0.25, -2.2)

  // Right tail wing
  shape.lineTo(1.2, -2.8)
  shape.lineTo(1.2, -3.1)
  shape.lineTo(0.15, -2.6)

  // Bottom center
  shape.lineTo(0, -3)

  // Mirror left side
  shape.lineTo(-0.15, -2.6)
  shape.lineTo(-1.2, -3.1)
  shape.lineTo(-1.2, -2.8)
  shape.lineTo(-0.25, -2.2)

  // Left fuselage
  shape.lineTo(-0.3, -1.0)
  shape.lineTo(-2.5, -1.2)
  shape.lineTo(-2.5, -0.8)
  shape.lineTo(-0.3, -0.5)
  shape.lineTo(-0.4, 1)
  shape.lineTo(0, 3)       // back to nose

  const geometry = new THREE.ShapeGeometry(shape)
  return geometry
}

/** Convert lat/lng/altitude to a scene-space Vector3 (shared globe math). */
function latLngToVec3(lat: number, lng: number, altitude: number): THREE.Vector3 {
  const { x, y, z } = latLngToGlobeXYZ(lat, lng, altitude)
  return new THREE.Vector3(x, y, z)
}

/** Calculate arc altitude matching the globe's arcAltitude callback */
function getArcAltitude(distance: number, t: number): number {
  const maxAlt = 0.08 + Math.min(distance / 90, 1) * 0.45
  // Parabolic arc: peaks at t=0.5
  return maxAlt * Math.sin(t * Math.PI)
}

export function ArcPlanes({ globe, arcs, visible }: ArcPlanesProps) {
  const planesRef = useRef<THREE.Mesh[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!globe || !visible || arcs.length === 0) {
      // Cleanup existing planes
      const scene = globe?.scene()
      if (scene) {
        planesRef.current.forEach(p => scene.remove(p))
      }
      planesRef.current = []
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      return
    }

    const scene = globe.scene()
    if (!scene) return

    // Remove old planes
    planesRef.current.forEach(p => scene.remove(p))
    planesRef.current = []

    const planeGeometry = createPlaneShape()

    // Create one plane per arc
    const planes: THREE.Mesh[] = arcs.map((arc) => {
      // Color matches arc gradient: pick the start color
      const progress = arc.total > 1 ? arc.index / (arc.total - 1) : 0.5
      const colorPairs = [
        '#7c9a3e',  // Olive green
        '#c4af5d',  // Gold
        '#63ceb4',  // Teal
        '#93a5dc',  // Blue
      ]
      const idx = Math.min(Math.floor(progress * (colorPairs.length - 1)), colorPairs.length - 1)

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorPairs[idx]),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })

      const mesh = new THREE.Mesh(planeGeometry.clone(), material)
      scene.add(mesh)
      return mesh
    })

    planesRef.current = planes

    // Animation loop
    const startTime = performance.now()

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000

      planes.forEach((mesh, i) => {
        const arc = arcs[i]
        if (!arc) return

        // Speed matches arcDashAnimateTime: 3-6s per cycle based on distance
        const cycleDuration = 3 + Math.min(arc.distance / 60, 1) * 3
        // Stagger start per arc, matching arcDashInitialGap
        const offset = (arc.index * 0.37) % 1
        const t = ((elapsed / cycleDuration) + offset) % 1

        // Interpolate position along great circle
        const pos = gcInterpolate(
          { lat: arc.startLat, lng: arc.startLng },
          { lat: arc.endLat, lng: arc.endLng },
          t
        )

        // Get altitude matching the arc's altitude curve
        const altitude = getArcAltitude(arc.distance, t)

        // Position the plane
        const position = latLngToVec3(pos.lat, pos.lng, altitude)
        mesh.position.copy(position)

        // Orient: look away from globe center (outward)
        const up = position.clone().normalize()

        // Calculate forward direction (tangent along the arc)
        const tNext = Math.min(t + 0.01, 1)
        const posNext = gcInterpolate(
          { lat: arc.startLat, lng: arc.startLng },
          { lat: arc.endLat, lng: arc.endLng },
          tNext
        )
        const altNext = getArcAltitude(arc.distance, tNext)
        const posNextVec = latLngToVec3(posNext.lat, posNext.lng, altNext)

        const forward = posNextVec.sub(position).normalize()

        // Create rotation matrix: forward is flight direction, up is away from globe
        const matrix = new THREE.Matrix4()
        const right = new THREE.Vector3().crossVectors(forward, up).normalize()
        const correctedUp = new THREE.Vector3().crossVectors(right, forward).normalize()

        matrix.makeBasis(right, forward, correctedUp)
        mesh.setRotationFromMatrix(matrix)

        // Scale based on altitude (slightly larger when higher)
        const scale = 0.15 + altitude * 0.1
        mesh.scale.set(scale, scale, scale)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      planes.forEach(p => {
        scene.remove(p)
        p.geometry.dispose()
        if (p.material instanceof THREE.Material) {
          p.material.dispose()
        }
      })
      planesRef.current = []
    }
  }, [globe, arcs, visible])

  return null
}
