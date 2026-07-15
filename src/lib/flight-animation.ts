interface Coordinates {
  latitude: number
  longitude: number
}

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
const MAX_BANK_DEGREES = 24

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const lat1 = toRadians(coord1.latitude)
  const lat2 = toRadians(coord2.latitude)
  const deltaLat = lat2 - lat1
  const deltaLng = toRadians(coord2.longitude - coord1.longitude)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const deltaLng = toRadians(to.longitude - from.longitude)
  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)
  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

/** Distance-aware cinematic duration: short hops feel quick, long routes breathe. */
export function calculateFlightDurationMs(distanceKm: number): number {
  return 2400 + Math.min(Math.max(distanceKm, 0) / 14000, 1) * 3000
}

export function interpolateGreatCircle(
  from: Coordinates,
  to: Coordinates,
  progress: number,
): FlightPoint {
  const t = Math.max(0, Math.min(1, progress))
  const lat1 = toRadians(from.latitude)
  const lng1 = toRadians(from.longitude)
  const lat2 = toRadians(to.latitude)
  const lng2 = toRadians(to.longitude)
  const angularDistance = calculateDistance(from, to) / EARTH_RADIUS_KM

  let lat: number
  let lng: number
  if (angularDistance < 1e-7) {
    lat = lat1 + (lat2 - lat1) * t
    lng = lng1 + (lng2 - lng1) * t
  } else {
    const sinDistance = Math.sin(angularDistance)
    const a = Math.sin((1 - t) * angularDistance) / sinDistance
    const b = Math.sin(t * angularDistance) / sinDistance
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
    const z = a * Math.sin(lat1) + b * Math.sin(lat2)
    lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    lng = Math.atan2(y, x)
  }

  const distanceKm = angularDistance * EARTH_RADIUS_KM
  const peakAltitude = 0.09 + Math.min(distanceKm / 14000, 1) * 0.24
  return {
    lat: toDegrees(lat),
    lng: toDegrees(lng),
    altitude: peakAltitude * Math.sin(t * Math.PI),
  }
}

export function smoothEaseInOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

export function calculateAirplaneRotation(
  currentPoint: FlightPoint,
  nextPoint: FlightPoint,
  previousHeading: number,
): { heading: number; pitch: number; bank: number } {
  const heading = calculateBearing(
    { latitude: currentPoint.lat, longitude: currentPoint.lng },
    { latitude: nextPoint.lat, longitude: nextPoint.lng },
  )
  let headingDelta = heading - previousHeading
  if (headingDelta > 180) headingDelta -= 360
  if (headingDelta < -180) headingDelta += 360

  const altitudeDelta = (nextPoint.altitude || 0) - (currentPoint.altitude || 0)
  return {
    heading,
    pitch: Math.max(-12, Math.min(12, altitudeDelta * 900)),
    bank: Math.max(-MAX_BANK_DEGREES, Math.min(MAX_BANK_DEGREES, headingDelta * 2.4)),
  }
}

export function calculateOptimalCameraPosition(
  airplanePosition: FlightPoint,
  destination: FlightPoint,
  progress: number,
): { lat: number; lng: number; altitude: number } {
  const lookAhead = interpolateGreatCircle(
    { latitude: airplanePosition.lat, longitude: airplanePosition.lng },
    { latitude: destination.lat, longitude: destination.lng },
    0.12,
  )
  return {
    lat: lookAhead.lat,
    lng: lookAhead.lng,
    altitude: 1.05 + Math.sin(Math.PI * progress) * 0.5,
  }
}

export class FlightAnimationEngine {
  private timeline: TravelTimelineEntry[] = []
  private currentSegmentIndex = 0
  private segmentProgress = 0
  private isPlaying = false
  private animationSpeed = 1
  private animationFrame: number | null = null
  private lastFrameTime: number | null = null
  private previousHeading = 0

  constructor(
    private readonly onPositionUpdate?: (state: AirplaneState) => void,
    private readonly onCameraUpdate?: (position: { lat: number; lng: number; altitude: number }) => void,
    private readonly onSegmentComplete?: (segment: TravelTimelineEntry) => void,
  ) {}

  setTimeline(timeline: TravelTimelineEntry[], year: number): void {
    this.timeline = timeline
      .filter((entry) => entry.year === year)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    this.reset()
  }

  play(): void {
    if (this.timeline.length < 2 || this.isPlaying) return
    if (this.currentSegmentIndex >= this.timeline.length - 1) {
      this.currentSegmentIndex = 0
      this.segmentProgress = 0
    }
    this.isPlaying = true
    this.lastFrameTime = null
    this.animationFrame = requestAnimationFrame(this.animate)
  }

  pause(): void {
    this.isPlaying = false
    this.lastFrameTime = null
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame)
    this.animationFrame = null
  }

  reset(): void {
    this.pause()
    this.currentSegmentIndex = 0
    this.segmentProgress = 0
    this.previousHeading = 0
  }

  setSpeed(speed: number): void {
    this.animationSpeed = Math.max(0.25, Math.min(3, speed))
  }

  seekToSegment(index: number): void {
    this.currentSegmentIndex = Math.max(0, Math.min(index, Math.max(0, this.timeline.length - 2)))
    this.segmentProgress = 0
    this.lastFrameTime = null
  }

  private animate = (timestamp: number): void => {
    if (!this.isPlaying || this.timeline.length < 2) return

    const current = this.timeline[this.currentSegmentIndex]
    const next = this.timeline[this.currentSegmentIndex + 1]
    if (!current || !next) {
      this.pause()
      return
    }

    const deltaSeconds = this.lastFrameTime === null
      ? 0
      : Math.min((timestamp - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = timestamp

    const from = { latitude: current.latitude, longitude: current.longitude }
    const to = { latitude: next.latitude, longitude: next.longitude }
    const distance = calculateDistance(from, to)
    const durationSeconds = calculateFlightDurationMs(distance) / 1000
    this.segmentProgress = Math.min(
      1,
      this.segmentProgress + (deltaSeconds * this.animationSpeed) / durationSeconds,
    )

    const easedProgress = smoothEaseInOut(this.segmentProgress)
    const position = interpolateGreatCircle(from, to, easedProgress)
    const ahead = interpolateGreatCircle(from, to, Math.min(1, easedProgress + 0.008))
    const rotation = calculateAirplaneRotation(position, ahead, this.previousHeading)
    this.previousHeading = rotation.heading

    this.onPositionUpdate?.({
      position,
      rotation,
      speed: this.animationSpeed / durationSeconds,
    })
    this.onCameraUpdate?.(
      calculateOptimalCameraPosition(
        position,
        { lat: to.latitude, lng: to.longitude, altitude: 0 },
        easedProgress,
      ),
    )

    if (this.segmentProgress >= 1) {
      this.onSegmentComplete?.(next)
      this.currentSegmentIndex += 1
      this.segmentProgress = 0
      this.previousHeading = 0

      if (this.currentSegmentIndex >= this.timeline.length - 1) {
        this.isPlaying = false
        this.animationFrame = null
        return
      }
    }

    this.animationFrame = requestAnimationFrame(this.animate)
  }

  getProgress(): {
    segment: number
    total: number
    percentage: number
    segmentPercentage: number
  } {
    const total = Math.max(this.timeline.length - 1, 1)
    const completed = Math.min(this.currentSegmentIndex, total)
    return {
      segment: Math.min(this.currentSegmentIndex, total - 1),
      total,
      percentage: ((completed + this.segmentProgress) / total) * 100,
      segmentPercentage: this.currentSegmentIndex >= total ? 100 : this.segmentProgress * 100,
    }
  }

  getTotalDuration(): number {
    let totalMs = 0
    for (let index = 0; index < this.timeline.length - 1; index += 1) {
      const from = this.timeline[index]
      const to = this.timeline[index + 1]
      totalMs += calculateFlightDurationMs(
        calculateDistance(
          { latitude: from.latitude, longitude: from.longitude },
          { latitude: to.latitude, longitude: to.longitude },
        ),
      )
    }
    return totalMs / this.animationSpeed
  }
}
