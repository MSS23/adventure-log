interface Coordinates {
  latitude: number
  longitude: number
}

interface FlightPoint {
  lat: number
  lng: number
  altitude?: number
}

interface FlightPath {
  points: FlightPoint[]
  distance: number
  duration: number
  bearing: number
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

interface TravelTimelineEntry {
  id: string
  year: number
  sequenceOrder: number
  cityId?: number
  countryId?: number
  visitDate: string
  latitude: number
  longitude: number
  albumCount: number
  photoCount: number
  locationName?: string
}

const EARTH_RADIUS_KM = 6371
const CRUISING_ALTITUDE = 0.02
const MIN_FLIGHT_SPEED = 0.005
const MAX_FLIGHT_SPEED = 0.02
const BANK_ANGLE_FACTOR = 30

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const lat1Rad = toRadians(coord1.latitude)
  const lng1Rad = toRadians(coord1.longitude)
  const lat2Rad = toRadians(coord2.latitude)
  const lng2Rad = toRadians(coord2.longitude)

  const dlat = lat2Rad - lat1Rad
  const dlng = lng2Rad - lng1Rad

  const a = Math.sin(dlat / 2) ** 2 +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dlng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const dlng = toRadians(to.longitude - from.longitude)

  const y = Math.sin(dlng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlng)

  const bearing = Math.atan2(y, x)
  return (toDegrees(bearing) + 360) % 360
}

export function interpolateGreatCircle(
  from: Coordinates,
  to: Coordinates,
  progress: number
): FlightPoint {
  const lat1 = toRadians(from.latitude)
  const lng1 = toRadians(from.longitude)
  const lat2 = toRadians(to.latitude)
  const lng2 = toRadians(to.longitude)

  const distance = calculateDistance(from, to) / EARTH_RADIUS_KM

  const a = Math.sin((1 - progress) * distance) / Math.sin(distance)
  const b = Math.sin(progress * distance) / Math.sin(distance)

  const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
  const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
  const z = a * Math.sin(lat1) + b * Math.sin(lat2)

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
  const lng = Math.atan2(y, x)

  const altitudeMultiplier = Math.sin(progress * Math.PI)
  const altitude = CRUISING_ALTITUDE * altitudeMultiplier

  return {
    lat: toDegrees(lat),
    lng: toDegrees(lng),
    altitude
  }
}

export function generateFlightPath(
  from: Coordinates,
  to: Coordinates,
  segments: number = 50
): FlightPath {
  const points: FlightPoint[] = []
  const distance = calculateDistance(from, to)
  const bearing = calculateBearing(from, to)

  for (let i = 0; i <= segments; i++) {
    const progress = i / segments
    const point = interpolateGreatCircle(from, to, progress)
    points.push(point)
  }

  const estimatedDuration = Math.max(
    distance / 800,
    2
  )

  return {
    points,
    distance,
    duration: estimatedDuration,
    bearing
  }
}

export function calculateFlightSpeed(distance: number): number {
  const normalizedDistance = Math.min(distance / 15000, 1)
  return MIN_FLIGHT_SPEED + (MAX_FLIGHT_SPEED - MIN_FLIGHT_SPEED) * normalizedDistance
}

export function calculateAirplaneRotation(
  currentPoint: FlightPoint,
  nextPoint: FlightPoint,
  prevBearing: number
): { heading: number; pitch: number; bank: number } {
  const heading = calculateBearing(
    { latitude: currentPoint.lat, longitude: currentPoint.lng },
    { latitude: nextPoint.lat, longitude: nextPoint.lng }
  )

  const bearingDiff = ((heading - prevBearing + 540) % 360) - 180
  const bank = Math.max(-BANK_ANGLE_FACTOR, Math.min(BANK_ANGLE_FACTOR, bearingDiff * 0.5))

  const altitudeDiff = (nextPoint.altitude || 0) - (currentPoint.altitude || 0)
  const pitch = Math.atan2(altitudeDiff, 0.1) * (180 / Math.PI)

  return {
    heading,
    pitch: Math.max(-15, Math.min(15, pitch)),
    bank
  }
}

export function smoothEaseInOut(t: number): number {
  return t * t * (3.0 - 2.0 * t)
}

export function calculateOptimalCameraPosition(
  airplanePos: FlightPoint,
  targetPos: FlightPoint,
  progress: number
): { lat: number; lng: number; altitude: number } {
  const midProgress = 0.5
  const isApproaching = progress < midProgress

  if (isApproaching) {
    const lookAheadProgress = Math.min(progress + 0.1, 1)
    const lookAheadPoint = interpolateGreatCircle(
      { latitude: airplanePos.lat, longitude: airplanePos.lng },
      { latitude: targetPos.lat, longitude: targetPos.lng },
      lookAheadProgress
    )

    return {
      lat: lookAheadPoint.lat,
      lng: lookAheadPoint.lng,
      altitude: Math.max(0.15, lookAheadPoint.altitude || 0.1)
    }
  } else {
    return {
      lat: targetPos.lat,
      lng: targetPos.lng,
      altitude: 0.12
    }
  }
}

export class FlightAnimationEngine {
  private timeline: TravelTimelineEntry[] = []
  private currentSegmentIndex = 0
  private segmentProgress = 0
  private isPlaying = false
  private animationSpeed = 1
  private currentYear: number | null = null
  private onPositionUpdate?: (state: AirplaneState) => void
  private onCameraUpdate?: (position: { lat: number; lng: number; altitude: number }) => void
  private onSegmentComplete?: (segment: TravelTimelineEntry) => void

  constructor(
    onPositionUpdate?: (state: AirplaneState) => void,
    onCameraUpdate?: (position: { lat: number; lng: number; altitude: number }) => void,
    onSegmentComplete?: (segment: TravelTimelineEntry) => void
  ) {
    this.onPositionUpdate = onPositionUpdate
    this.onCameraUpdate = onCameraUpdate
    this.onSegmentComplete = onSegmentComplete
  }

  setTimeline(timeline: TravelTimelineEntry[], year: number): void {
    this.timeline = timeline.filter(entry => entry.year === year)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    this.currentYear = year
    this.reset()
  }

  play(): void {
    this.isPlaying = true
    this.animate()
  }

  pause(): void {
    this.isPlaying = false
  }

  reset(): void {
    this.currentSegmentIndex = 0
    this.segmentProgress = 0
    this.isPlaying = false
  }

  setSpeed(speed: number): void {
    this.animationSpeed = Math.max(0.1, Math.min(5, speed))
  }

  seekToSegment(index: number): void {
    this.currentSegmentIndex = Math.max(0, Math.min(index, this.timeline.length - 2))
    this.segmentProgress = 0
  }

  private animate(): void {
    if (!this.isPlaying || this.timeline.length < 2) return

    const deltaTime = 0.016
    const currentSegment = this.timeline[this.currentSegmentIndex]
    const nextSegment = this.timeline[this.currentSegmentIndex + 1]

    if (!currentSegment || !nextSegment) {
      this.isPlaying = false
      return
    }

    const from = { latitude: currentSegment.latitude, longitude: currentSegment.longitude }
    const to = { latitude: nextSegment.latitude, longitude: nextSegment.longitude }
    const distance = calculateDistance(from, to)
    const speed = calculateFlightSpeed(distance) * this.animationSpeed

    this.segmentProgress = Math.min(this.segmentProgress + speed * deltaTime, 1)

    const smoothProgress = smoothEaseInOut(this.segmentProgress)
    const currentPosition = interpolateGreatCircle(from, to, smoothProgress)

    const nextPosition = this.segmentProgress < 0.99
      ? interpolateGreatCircle(from, to, smoothProgress + 0.01)
      : currentPosition

    const rotation = calculateAirplaneRotation(
      currentPosition,
      nextPosition,
      calculateBearing(from, to)
    )

    const airplaneState: AirplaneState = {
      position: currentPosition,
      rotation,
      speed: speed * this.animationSpeed
    }

    this.onPositionUpdate?.(airplaneState)

    const cameraPosition = calculateOptimalCameraPosition(
      currentPosition,
      { lat: to.latitude, lng: to.longitude, altitude: 0 },
      smoothProgress
    )
    this.onCameraUpdate?.(cameraPosition)

    if (this.segmentProgress >= 1) {
      this.onSegmentComplete?.(nextSegment)
      this.currentSegmentIndex++
      this.segmentProgress = 0

      if (this.currentSegmentIndex >= this.timeline.length - 1) {
        this.isPlaying = false
        return
      }
    }

    if (this.isPlaying) {
      requestAnimationFrame(() => this.animate())
    }
  }

  getCurrentSegment(): TravelTimelineEntry | null {
    return this.timeline[this.currentSegmentIndex] || null
  }

  getProgress(): { segment: number; total: number; percentage: number } {
    const total = Math.max(this.timeline.length - 1, 1)
    const current = this.currentSegmentIndex + this.segmentProgress
    return {
      segment: this.currentSegmentIndex,
      total,
      percentage: (current / total) * 100
    }
  }

  getTotalDuration(): number {
    let totalDuration = 0
    for (let i = 0; i < this.timeline.length - 1; i++) {
      const from = this.timeline[i]
      const to = this.timeline[i + 1]
      const distance = calculateDistance(
        { latitude: from.latitude, longitude: from.longitude },
        { latitude: to.latitude, longitude: to.longitude }
      )
      totalDuration += Math.max(distance / 800, 2)
    }
    return totalDuration / this.animationSpeed
  }
}