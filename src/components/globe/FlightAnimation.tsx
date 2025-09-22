'use client'

import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { type GlobeInstance } from '@/types/globe'

interface FlightPoint {
  lat: number
  lng: number
  altitude?: number
}

interface AirplaneState {
  position: FlightPoint
  rotation: {
    heading: number
    pitch: number
    bank: number
  }
  speed: number
}

interface FlightTrail {
  points: THREE.Vector3[]
  opacity: number
  maxLength: number
}

interface FlightAnimationProps {
  globe: GlobeInstance | null
  airplaneState: AirplaneState | null
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
  const airplaneRef = useRef<THREE.Group>(null)
  const trailRef = useRef<THREE.Line>(null)
  const [trail, setTrail] = useState<FlightTrail>({
    points: [],
    opacity: 1,
    maxLength: 200
  })

  const createAirplane = (): THREE.Group => {
    const airplane = new THREE.Group()

    const fuselageGeometry = new THREE.CylinderGeometry(0.1, 0.05, 2, 8)
    const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff })
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial)
    fuselage.rotation.z = Math.PI / 2
    airplane.add(fuselage)

    const wingGeometry = new THREE.BoxGeometry(3, 0.1, 0.5)
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc })
    const wings = new THREE.Mesh(wingGeometry, wingMaterial)
    wings.position.z = -0.2
    airplane.add(wings)

    const tailGeometry = new THREE.BoxGeometry(0.8, 0.1, 1.5)
    const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc })
    const tail = new THREE.Mesh(tailGeometry, tailMaterial)
    tail.position.x = -0.8
    tail.rotation.z = Math.PI / 4
    airplane.add(tail)

    const cockpitGeometry = new THREE.SphereGeometry(0.15, 8, 6)
    const cockpitMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    })
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial)
    cockpit.position.x = 0.7
    cockpit.scale.set(1, 1, 0.7)
    airplane.add(cockpit)

    const engineGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8)
    const engineMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 })

    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial)
    leftEngine.rotation.z = Math.PI / 2
    leftEngine.position.set(0, 0.8, -0.1)
    airplane.add(leftEngine)

    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial)
    rightEngine.rotation.z = Math.PI / 2
    rightEngine.position.set(0, -0.8, -0.1)
    airplane.add(rightEngine)

    const windowGeometry = new THREE.PlaneGeometry(0.8, 0.2)
    const windowMaterial = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6
    })
    const windows = new THREE.Mesh(windowGeometry, windowMaterial)
    windows.position.set(0.2, 0, 0.11)
    airplane.add(windows)

    return airplane
  }

  const createTrailGeometry = (points: THREE.Vector3[]): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)

    points.forEach((point, index) => {
      positions[index * 3] = point.x
      positions[index * 3 + 1] = point.y
      positions[index * 3 + 2] = point.z

      const color = new THREE.Color(trailColor)
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geometry
  }

  const latLngToVector3 = (lat: number, lng: number, altitude: number = 0): THREE.Vector3 => {
    const radius = 100 + altitude * 100
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)

    return new THREE.Vector3(x, y, z)
  }

  useEffect(() => {
    if (!globe || !isActive) return

    const scene = globe.scene()
    if (!scene) return

    if (!airplaneRef.current) {
      const airplane = createAirplane()
      airplane.scale.setScalar(airplaneScale)
      airplaneRef.current = airplane
      scene.add(airplane)
    }

    const trailGeometry = new THREE.BufferGeometry()
    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    })

    if (!trailRef.current) {
      const trailLine = new THREE.Line(trailGeometry, trailMaterial)
      trailRef.current = trailLine
      scene.add(trailLine)
    }

    return () => {
      if (airplaneRef.current) {
        scene.remove(airplaneRef.current)
        airplaneRef.current = null
      }
      if (trailRef.current) {
        scene.remove(trailRef.current)
        trailRef.current = null
      }
    }
  }, [globe, isActive, airplaneScale])

  useEffect(() => {
    if (!airplaneState || !airplaneRef.current || !globe) return

    const { position, rotation } = airplaneState
    const airplane = airplaneRef.current

    const airplanePosition = latLngToVector3(
      position.lat,
      position.lng,
      position.altitude || 0.02
    )

    airplane.position.copy(airplanePosition)

    const headingRad = (rotation.heading * Math.PI) / 180
    const pitchRad = (rotation.pitch * Math.PI) / 180
    const bankRad = (rotation.bank * Math.PI) / 180

    airplane.rotation.set(pitchRad, headingRad, bankRad)

    airplane.lookAt(
      airplanePosition.x + Math.sin(headingRad),
      airplanePosition.y,
      airplanePosition.z + Math.cos(headingRad)
    )

    setTrail(prevTrail => {
      const newPoints = [...prevTrail.points, airplanePosition.clone()]

      if (newPoints.length > prevTrail.maxLength) {
        newPoints.shift()
      }

      return {
        ...prevTrail,
        points: newPoints
      }
    })

  }, [airplaneState, globe])

  useEffect(() => {
    if (!trailRef.current || trail.points.length < 2) return

    const geometry = createTrailGeometry(trail.points)
    trailRef.current.geometry.dispose()
    trailRef.current.geometry = geometry

    const material = trailRef.current.material as THREE.LineBasicMaterial
    material.opacity = trail.opacity

    const fadeInterval = setInterval(() => {
      setTrail(prevTrail => {
        const newOpacity = Math.max(0.3, prevTrail.opacity * 0.995)
        return {
          ...prevTrail,
          opacity: newOpacity
        }
      })
    }, 100)

    return () => clearInterval(fadeInterval)
  }, [trail.points])

  useEffect(() => {
    if (!isActive) {
      setTrail(prevTrail => ({
        ...prevTrail,
        points: [],
        opacity: 1
      }))
    }
  }, [isActive])

  return null
}