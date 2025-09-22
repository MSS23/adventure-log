interface FlightPath {
  start: { lat: number; lng: number; name: string }
  end: { lat: number; lng: number; name: string }
  distance: number
  duration: number // animation duration in milliseconds
  waypoints: { lat: number; lng: number }[] // for curved flight paths
  bearing: number
  estimatedFlightTime: number // real flight time in hours
}

interface FlightSegment {
  lat: number
  lng: number
  altitude: number
  progress: number
  heading: number
  timestamp: number
}

const EARTH_RADIUS_KM = 6371
const CRUISE_ALTITUDE = 0.02 // Globe units

export class FlightPathCalculator {
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI)
  }

  /**
   * Calculate great circle distance between two points
   */
  static calculateDistance(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): number {
    const lat1Rad = this.toRadians(start.lat)
    const lng1Rad = this.toRadians(start.lng)
    const lat2Rad = this.toRadians(end.lat)
    const lng2Rad = this.toRadians(end.lng)

    const dlat = lat2Rad - lat1Rad
    const dlng = lng2Rad - lng1Rad

    const a = Math.sin(dlat / 2) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dlng / 2) ** 2

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c
  }

  /**
   * Calculate initial bearing from start to end point
   */
  static calculateBearing(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): number {
    const lat1 = this.toRadians(start.lat)
    const lat2 = this.toRadians(end.lat)
    const dlng = this.toRadians(end.lng - start.lng)

    const y = Math.sin(dlng) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlng)

    const bearing = Math.atan2(y, x)
    return (this.toDegrees(bearing) + 360) % 360
  }

  /**
   * Generate flight path with realistic arc
   */
  static generateFlightPath(
    start: { lat: number; lng: number; name: string },
    end: { lat: number; lng: number; name: string },
    segments: number = 100
  ): FlightPath {
    const distance = this.calculateDistance(start, end)
    const bearing = this.calculateBearing(start, end)

    // Calculate realistic flight time (commercial aviation average speed: 900 km/h)
    const estimatedFlightTime = distance / 900

    // Animation duration based on distance (longer flights animate faster)
    const baseDuration = 3000 // 3 seconds for short flights
    const maxDuration = 8000 // 8 seconds for long flights
    const duration = Math.min(
      maxDuration,
      Math.max(baseDuration, distance * 50)
    )

    const waypoints = this.generateGreatCircleWaypoints(start, end, segments)

    return {
      start,
      end,
      distance,
      duration,
      waypoints,
      bearing,
      estimatedFlightTime
    }
  }

  /**
   * Generate waypoints along great circle route with realistic altitude curve
   */
  private static generateGreatCircleWaypoints(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    segments: number
  ): { lat: number; lng: number }[] {
    const waypoints: { lat: number; lng: number }[] = []

    const lat1 = this.toRadians(start.lat)
    const lng1 = this.toRadians(start.lng)
    const lat2 = this.toRadians(end.lat)
    const lng2 = this.toRadians(end.lng)

    const distance = this.calculateDistance(start, end) / EARTH_RADIUS_KM

    for (let i = 0; i <= segments; i++) {
      const f = i / segments

      // Great circle interpolation
      const a = Math.sin((1 - f) * distance) / Math.sin(distance)
      const b = Math.sin(f * distance) / Math.sin(distance)

      const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
      const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
      const z = a * Math.sin(lat1) + b * Math.sin(lat2)

      const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
      const lng = Math.atan2(y, x)

      waypoints.push({
        lat: this.toDegrees(lat),
        lng: this.toDegrees(lng)
      })
    }

    return waypoints
  }

  /**
   * Generate flight segments with altitude and timing
   */
  static generateFlightSegments(
    flightPath: FlightPath,
    frameRate: number = 60
  ): FlightSegment[] {
    const segments: FlightSegment[] = []
    const totalFrames = Math.floor((flightPath.duration / 1000) * frameRate)

    for (let frame = 0; frame <= totalFrames; frame++) {
      const progress = frame / totalFrames
      const waypointIndex = Math.floor(progress * (flightPath.waypoints.length - 1))
      const waypointProgress = (progress * (flightPath.waypoints.length - 1)) % 1

      // Get current and next waypoint
      const currentWaypoint = flightPath.waypoints[waypointIndex]
      const nextWaypoint = flightPath.waypoints[Math.min(waypointIndex + 1, flightPath.waypoints.length - 1)]

      // Interpolate position
      const lat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * waypointProgress
      const lng = currentWaypoint.lng + (nextWaypoint.lng - currentWaypoint.lng) * waypointProgress

      // Calculate altitude with realistic takeoff/cruise/landing profile
      const altitude = this.calculateAltitude(progress, flightPath.distance)

      // Calculate heading
      const heading = this.calculateBearing(currentWaypoint, nextWaypoint)

      segments.push({
        lat,
        lng,
        altitude,
        progress,
        heading,
        timestamp: (frame / frameRate) * 1000
      })
    }

    return segments
  }

  /**
   * Calculate realistic altitude profile for flight
   */
  private static calculateAltitude(progress: number, distance: number): number {
    // Short flights (< 500km) have lower cruise altitude
    const maxAltitude = distance < 500 ? CRUISE_ALTITUDE * 0.6 : CRUISE_ALTITUDE

    if (progress < 0.1) {
      // Takeoff phase (0-10%)
      return (progress / 0.1) * maxAltitude
    } else if (progress > 0.9) {
      // Landing phase (90-100%)
      return ((1 - progress) / 0.1) * maxAltitude
    } else {
      // Cruise phase (10-90%)
      return maxAltitude
    }
  }

  /**
   * Calculate airplane rotation for realistic banking during turns
   */
  static calculateAirplaneRotation(
    currentSegment: FlightSegment,
    previousSegment: FlightSegment | null,
    nextSegment: FlightSegment | null
  ): { pitch: number; yaw: number; roll: number } {
    const pitch = this.calculatePitch(currentSegment, nextSegment)
    const yaw = currentSegment.heading
    const roll = this.calculateRoll(currentSegment, previousSegment)

    return { pitch, yaw, roll }
  }

  private static calculatePitch(
    current: FlightSegment,
    next: FlightSegment | null
  ): number {
    if (!next) return 0

    const altitudeDiff = next.altitude - current.altitude
    const horizontalDistance = 0.001 // Small distance for pitch calculation

    return Math.atan2(altitudeDiff, horizontalDistance) * (180 / Math.PI)
  }

  private static calculateRoll(
    current: FlightSegment,
    previous: FlightSegment | null
  ): number {
    if (!previous) return 0

    const headingChange = current.heading - previous.heading

    // Normalize heading change to -180 to 180 range
    let normalizedChange = headingChange
    if (normalizedChange > 180) normalizedChange -= 360
    if (normalizedChange < -180) normalizedChange += 360

    // Bank angle proportional to turn rate (max 30 degrees)
    const maxBankAngle = 30
    const bankAngle = Math.max(-maxBankAngle, Math.min(maxBankAngle, normalizedChange * 2))

    return bankAngle
  }

  /**
   * Generate multiple flight paths for a year's travel
   */
  static generateYearFlightPaths(
    locations: Array<{ lat: number; lng: number; name: string; date: Date }>
  ): FlightPath[] {
    const sortedLocations = locations.sort((a, b) => a.date.getTime() - b.date.getTime())
    const flightPaths: FlightPath[] = []

    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const start = sortedLocations[i]
      const end = sortedLocations[i + 1]

      const flightPath = this.generateFlightPath(start, end)
      flightPaths.push(flightPath)
    }

    return flightPaths
  }

  /**
   * Calculate optimal camera position for following flight
   */
  static calculateCameraPosition(
    flightSegment: FlightSegment
  ): { lat: number; lng: number; altitude: number } {
    // Camera follows slightly behind and above the airplane
    const trailDistance = 0.05 // Distance behind airplane
    const cameraAltitude = flightSegment.altitude + 0.5

    // Calculate position behind airplane based on heading
    const headingRad = this.toRadians(flightSegment.heading + 180) // Opposite direction
    const offsetLat = flightSegment.lat + Math.cos(headingRad) * trailDistance
    const offsetLng = flightSegment.lng + Math.sin(headingRad) * trailDistance

    return {
      lat: offsetLat,
      lng: offsetLng,
      altitude: cameraAltitude
    }
  }
}

export { type FlightPath, type FlightSegment }