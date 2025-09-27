'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Vector3,
  Group,
  Line,
  Mesh,
  CylinderGeometry,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  BufferGeometry,
  MeshPhongMaterial,
  LineBasicMaterial,
  BufferAttribute,
  Color
} from 'three'
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
  points: Vector3[]
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
  const airplaneRef = useRef<Group>(null)
  const trailRef = useRef<Line>(null)
  const [trail, setTrail] = useState<FlightTrail>({
    points: [],
    opacity: 1,
    maxLength: 200
  })

  const createAirplane = (): Group => {
    const airplane = new Group()

    const fuselageGeometry = new CylinderGeometry(0.1, 0.05, 2, 8)
    const fuselageMaterial = new MeshPhongMaterial({ color: 0xffffff })
    const fuselage = new Mesh(fuselageGeometry, fuselageMaterial)
    fuselage.rotation.z = Math.PI / 2
    airplane.add(fuselage)

    const wingGeometry = new BoxGeometry(3, 0.1, 0.5)
    const wingMaterial = new MeshPhongMaterial({ color: 0xcccccc })
    const wings = new Mesh(wingGeometry, wingMaterial)
    wings.position.z = -0.2
    airplane.add(wings)

    const tailGeometry = new BoxGeometry(0.8, 0.1, 1.5)
    const tailMaterial = new MeshPhongMaterial({ color: 0xcccccc })
    const tail = new Mesh(tailGeometry, tailMaterial)
    tail.position.x = -0.8
    tail.rotation.z = Math.PI / 4
    airplane.add(tail)

    const cockpitGeometry = new SphereGeometry(0.15, 8, 6)
    const cockpitMaterial = new MeshPhongMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    })
    const cockpit = new Mesh(cockpitGeometry, cockpitMaterial)
    cockpit.position.x = 0.7
    cockpit.scale.set(1, 1, 0.7)
    airplane.add(cockpit)

    const engineGeometry = new CylinderGeometry(0.12, 0.12, 0.4, 8)
    const engineMaterial = new MeshPhongMaterial({ color: 0x444444 })

    const leftEngine = new Mesh(engineGeometry, engineMaterial)
    leftEngine.rotation.z = Math.PI / 2
    leftEngine.position.set(0, 0.8, -0.1)
    airplane.add(leftEngine)

    const rightEngine = new Mesh(engineGeometry, engineMaterial)
    rightEngine.rotation.z = Math.PI / 2
    rightEngine.position.set(0, -0.8, -0.1)
    airplane.add(rightEngine)

    const windowGeometry = new PlaneGeometry(0.8, 0.2)
    const windowMaterial = new MeshPhongMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6
    })
    const windows = new Mesh(windowGeometry, windowMaterial)
    windows.position.set(0.2, 0, 0.11)
    airplane.add(windows)

    return airplane
  }

  const createTrailGeometry = useCallback((points: Vector3[]): BufferGeometry => {
    const geometry = new BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)

    points.forEach((point, index) => {
      positions[index * 3] = point.x
      positions[index * 3 + 1] = point.y
      positions[index * 3 + 2] = point.z

      // Safely handle color conversion, avoid rgba() strings
      let color: Color
      try {
        // Remove alpha channel from rgba/hsla strings and convert to hex
        const cleanColor = trailColor.includes('rgba(') || trailColor.includes('hsla(')
          ? '#00ff88' // fallback for rgba/hsla
          : trailColor
        color = new Color(cleanColor)
      } catch {
        color = new Color('#00ff88') // fallback color
      }

      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    })

    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))

    return geometry
  }, [trailColor])

  const latLngToVector3 = (lat: number, lng: number, altitude: number = 0): Vector3 => {
    // Validate and clamp coordinates
    const validLat = isNaN(lat) ? 0 : Math.max(-90, Math.min(90, lat))
    const validLng = isNaN(lng) ? 0 : ((lng % 360 + 360) % 360) - 180
    const validAltitude = isNaN(altitude) ? 0 : Math.max(0, Math.min(100, altitude))

    const radius = 100 + validAltitude * 100
    const phi = (90 - validLat) * (Math.PI / 180)
    const theta = (validLng + 180) * (Math.PI / 180)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)

    // Validate final vector components
    const validX = isNaN(x) ? 0 : x
    const validY = isNaN(y) ? 0 : y
    const validZ = isNaN(z) ? 0 : z

    return new Vector3(validX, validY, validZ)
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

    const trailGeometry = new BufferGeometry()
    const trailMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    })

    if (!trailRef.current) {
      const trailLine = new Line(trailGeometry, trailMaterial)
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

    const material = trailRef.current.material as LineBasicMaterial
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
  }, [trail.points, createTrailGeometry, trail.opacity])

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