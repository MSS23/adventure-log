/**
 * Geospatial calculations and utilities for Roamkeep
 * Handles coordinate transformations, distance calculations, and geographic data processing
 */

interface Coordinates {
  latitude: number
  longitude: number
}

interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

interface GeoCluster {
  centroid: Coordinates
  locations: Array<Coordinates & { id: string; name: string }>
  radius: number
  count: number
}

export class GeoCalculations {
  private static readonly EARTH_RADIUS_KM = 6371
  private static readonly EARTH_RADIUS_MILES = 3959
  private static readonly DEGREES_TO_RADIANS = Math.PI / 180
  private static readonly RADIANS_TO_DEGREES = 180 / Math.PI

  /**
   * Convert degrees to radians
   */
  static toRadians(degrees: number): number {
    return degrees * this.DEGREES_TO_RADIANS
  }

  /**
   * Convert radians to degrees
   */
  static toDegrees(radians: number): number {
    return radians * this.RADIANS_TO_DEGREES
  }

  /**
   * Calculate Haversine distance between two points
   */
  static calculateDistance(
    point1: Coordinates,
    point2: Coordinates,
    unit: 'km' | 'miles' = 'km'
  ): number {
    const lat1Rad = this.toRadians(point1.latitude)
    const lng1Rad = this.toRadians(point1.longitude)
    const lat2Rad = this.toRadians(point2.latitude)
    const lng2Rad = this.toRadians(point2.longitude)

    const dlat = lat2Rad - lat1Rad
    const dlng = lng2Rad - lng1Rad

    const a = Math.sin(dlat / 2) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dlng / 2) ** 2

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const radius = unit === 'km' ? this.EARTH_RADIUS_KM : this.EARTH_RADIUS_MILES

    return radius * c
  }

  /**
   * Calculate initial bearing from point1 to point2
   */
  static calculateBearing(point1: Coordinates, point2: Coordinates): number {
    const lat1 = this.toRadians(point1.latitude)
    const lat2 = this.toRadians(point2.latitude)
    const dlng = this.toRadians(point2.longitude - point1.longitude)

    const y = Math.sin(dlng) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlng)

    const bearing = Math.atan2(y, x)
    return (this.toDegrees(bearing) + 360) % 360
  }

  /**
   * Calculate destination point given start point, distance, and bearing
   */
  static calculateDestination(
    start: Coordinates,
    distance: number,
    bearing: number,
    unit: 'km' | 'miles' = 'km'
  ): Coordinates {
    const radius = unit === 'km' ? this.EARTH_RADIUS_KM : this.EARTH_RADIUS_MILES
    const angularDistance = distance / radius

    const lat1 = this.toRadians(start.latitude)
    const lng1 = this.toRadians(start.longitude)
    const bearingRad = this.toRadians(bearing)

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
    )

    const lng2 = lng1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    )

    return {
      latitude: this.toDegrees(lat2),
      longitude: this.toDegrees(lng2)
    }
  }

  /**
   * Calculate midpoint between two coordinates
   */
  static calculateMidpoint(point1: Coordinates, point2: Coordinates): Coordinates {
    const lat1 = this.toRadians(point1.latitude)
    const lng1 = this.toRadians(point1.longitude)
    const lat2 = this.toRadians(point2.latitude)
    const dlng = this.toRadians(point2.longitude - point1.longitude)

    const bx = Math.cos(lat2) * Math.cos(dlng)
    const by = Math.cos(lat2) * Math.sin(dlng)

    const lat3 = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2)
    )

    const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx)

    return {
      latitude: this.toDegrees(lat3),
      longitude: this.toDegrees(lng3)
    }
  }

  /**
   * Check if a point is within a bounding box
   */
  static isPointInBounds(point: Coordinates, bounds: BoundingBox): boolean {
    return point.latitude >= bounds.south &&
           point.latitude <= bounds.north &&
           point.longitude >= bounds.west &&
           point.longitude <= bounds.east
  }

  /**
   * Calculate bounding box from center point and radius
   */
  static calculateBoundingBox(
    center: Coordinates,
    radiusKm: number
  ): BoundingBox {
    const lat = this.toRadians(center.latitude)
    const lng = this.toRadians(center.longitude)
    const angularDistance = radiusKm / this.EARTH_RADIUS_KM

    const latMin = lat - angularDistance
    const latMax = lat + angularDistance

    // Handle longitude wrap-around
    const deltaLng = Math.asin(Math.sin(angularDistance) / Math.cos(lat))
    const lngMin = lng - deltaLng
    const lngMax = lng + deltaLng

    return {
      north: this.toDegrees(latMax),
      south: this.toDegrees(latMin),
      east: this.toDegrees(lngMax),
      west: this.toDegrees(lngMin)
    }
  }

  /**
   * Cluster nearby points based on distance threshold
   */
  static clusterPoints(
    points: Array<Coordinates & { id: string; name: string }>,
    maxDistanceKm: number = 100
  ): GeoCluster[] {
    const clusters: GeoCluster[] = []
    const processed = new Set<string>()

    for (const point of points) {
      if (processed.has(point.id)) continue

      const cluster: GeoCluster = {
        centroid: { latitude: point.latitude, longitude: point.longitude },
        locations: [point],
        radius: 0,
        count: 1
      }

      processed.add(point.id)

      // Find nearby points
      for (const otherPoint of points) {
        if (processed.has(otherPoint.id)) continue

        const distance = this.calculateDistance(point, otherPoint)
        if (distance <= maxDistanceKm) {
          cluster.locations.push(otherPoint)
          processed.add(otherPoint.id)
        }
      }

      // Recalculate centroid for multi-point clusters
      if (cluster.locations.length > 1) {
        cluster.centroid = this.calculateCentroid(cluster.locations)
        cluster.radius = this.calculateClusterRadius(cluster.centroid, cluster.locations)
      }

      cluster.count = cluster.locations.length
      clusters.push(cluster)
    }

    return clusters
  }

  /**
   * Calculate centroid (geographic center) of a set of points
   */
  static calculateCentroid(points: Coordinates[]): Coordinates {
    if (points.length === 0) {
      throw new Error('Cannot calculate centroid of empty point set')
    }

    if (points.length === 1) {
      return { latitude: points[0].latitude, longitude: points[0].longitude }
    }

    let x = 0
    let y = 0
    let z = 0

    for (const point of points) {
      const lat = this.toRadians(point.latitude)
      const lng = this.toRadians(point.longitude)

      x += Math.cos(lat) * Math.cos(lng)
      y += Math.cos(lat) * Math.sin(lng)
      z += Math.sin(lat)
    }

    x /= points.length
    y /= points.length
    z /= points.length

    const lng = Math.atan2(y, x)
    const hyp = Math.sqrt(x * x + y * y)
    const lat = Math.atan2(z, hyp)

    return {
      latitude: this.toDegrees(lat),
      longitude: this.toDegrees(lng)
    }
  }

  /**
   * Calculate the maximum distance from centroid to any point in cluster
   */
  private static calculateClusterRadius(
    centroid: Coordinates,
    points: Coordinates[]
  ): number {
    let maxDistance = 0

    for (const point of points) {
      const distance = this.calculateDistance(centroid, point)
      maxDistance = Math.max(maxDistance, distance)
    }

    return maxDistance
  }

  /**
   * Normalize longitude to -180 to 180 range
   */
  static normalizeLongitude(lng: number): number {
    while (lng > 180) lng -= 360
    while (lng < -180) lng += 360
    return lng
  }

  /**
   * Normalize latitude to -90 to 90 range
   */
  static normalizeLatitude(lat: number): number {
    return Math.max(-90, Math.min(90, lat))
  }

  /**
   * Convert coordinates to what3words-style readable location
   * This is a simplified version - real implementation would use what3words API
   */
  static coordinatesToReadableLocation(coords: Coordinates): string {
    const lat = Math.abs(coords.latitude).toFixed(4)
    const lng = Math.abs(coords.longitude).toFixed(4)
    const latDir = coords.latitude >= 0 ? 'N' : 'S'
    const lngDir = coords.longitude >= 0 ? 'E' : 'W'

    return `${lat}°${latDir}, ${lng}°${lngDir}`
  }

  /**
   * Calculate great circle intermediate points
   */
  static interpolateGreatCircle(
    start: Coordinates,
    end: Coordinates,
    fraction: number
  ): Coordinates {
    const lat1 = this.toRadians(start.latitude)
    const lng1 = this.toRadians(start.longitude)
    const lat2 = this.toRadians(end.latitude)
    const lng2 = this.toRadians(end.longitude)

    const dlat = lat2 - lat1
    const dlng = lng2 - lng1

    const a = Math.sin((1 - fraction) * dlat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin((1 - fraction) * dlng / 2) ** 2

    const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    if (angularDistance === 0) {
      return { latitude: start.latitude, longitude: start.longitude }
    }

    const A = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance)
    const B = Math.sin(fraction * angularDistance) / Math.sin(angularDistance)

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)

    const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2))
    const lng = Math.atan2(y, x)

    return {
      latitude: this.toDegrees(lat),
      longitude: this.toDegrees(lng)
    }
  }

  /**
   * Check if coordinates are valid
   */
  static areValidCoordinates(coords: Coordinates): boolean {
    return coords.latitude >= -90 &&
           coords.latitude <= 90 &&
           coords.longitude >= -180 &&
           coords.longitude <= 180 &&
           !isNaN(coords.latitude) &&
           !isNaN(coords.longitude)
  }

  /**
   * Calculate approximate zoom level for distance
   */
  static calculateZoomLevel(distanceKm: number): number {
    // Rough approximation for web maps
    const zoomLevel = Math.max(1, Math.min(18, Math.log2(40075 / distanceKm) + 1))
    return Math.round(zoomLevel)
  }

  /**
   * Get country from coordinates (simplified - would use reverse geocoding API in real implementation)
   */
  static getApproximateCountry(coords: Coordinates): string | null {
    // This is a very simplified country detection
    // In a real application, you'd use a reverse geocoding service

    const { latitude, longitude } = coords

    // Basic continent/region detection
    if (latitude > 24 && latitude < 50 && longitude > -125 && longitude < -66) {
      return 'United States'
    }
    if (latitude > 49 && latitude < 60 && longitude > -141 && longitude < -52) {
      return 'Canada'
    }
    if (latitude > 35 && latitude < 71 && longitude > -10 && longitude < 40) {
      return 'Europe'
    }
    if (latitude > -35 && latitude < 38 && longitude > 60 && longitude < 180) {
      return 'Asia'
    }
    if (latitude > -35 && latitude < 37 && longitude > -20 && longitude < 60) {
      return 'Africa'
    }
    if (latitude > -55 && latitude < 15 && longitude > -82 && longitude < -30) {
      return 'South America'
    }
    if (latitude > -50 && latitude < -10 && longitude > 110 && longitude < 180) {
      return 'Australia'
    }

    return null
  }
}

/**
 * Great-circle distance in kilometres between two lat/lng points (Haversine).
 *
 * Standalone helper mirroring {@link GeoCalculations.calculateDistance} for the
 * common `(lat1, lng1, lat2, lng2)` call shape used across travel-stats code —
 * so features don't each hand-roll their own copy.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/**
 * Format a kilometre distance for display, abbreviating thousands and always
 * including the unit — e.g. `500 km`, `1.2k km`. The single source of truth for
 * the several travel-stat surfaces that used to each define this inline.
 */
export function formatDistanceKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`
  return `${km.toLocaleString()} km`
}

/* ───────────────────────────────────────────────────────────────────────────
 * Globe-flavoured `{lat, lng}` helpers
 *
 * The 3D globe surfaces (EnhancedGlobe arcs/planes, the Wrapped flight globe)
 * all work in the `{lat, lng}` shape react-globe.gl uses. These standalone
 * functions are THE implementations of the spherical math those features need
 * — WrappedGlobe, ArcPlanes and FlightAnimation used to each carry their own
 * copy, which is exactly how the passport/wrapped personality labels diverged
 * once before. Visual tuning (arc peak heights, easing choices per animation)
 * stays local to each feature; the math lives here.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface LatLng {
  lat: number
  lng: number
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

/**
 * Spherical (great-circle) interpolation between two points.
 * `t` ∈ [0, 1]; returns `a` when the points coincide.
 */
export function gcInterpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const φ1 = a.lat * DEG
  const φ2 = b.lat * DEG
  const λ1 = a.lng * DEG
  const λ2 = b.lng * DEG

  const h =
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  const δ = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  // Same point — nothing to interpolate.
  if (δ < 1e-9) return { lat: a.lat, lng: a.lng }

  const A = Math.sin((1 - t) * δ) / Math.sin(δ)
  const B = Math.sin(t * δ) / Math.sin(δ)

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)

  return {
    lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD,
    lng: Math.atan2(y, x) * RAD,
  }
}

/** Initial bearing in degrees (0 = north, clockwise) from `a` toward `b`. */
export function gcBearing(a: LatLng, b: LatLng): number {
  const φ1 = a.lat * DEG
  const φ2 = b.lat * DEG
  const Δλ = (b.lng - a.lng) * DEG
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * RAD + 360) % 360
}

/**
 * Convert lat/lng/altitude to three-globe's scene coordinates (globe radius
 * 100, altitude in globe-radius units). Returned as a plain `{x, y, z}` so
 * this module stays free of a Three.js import — globe components wrap it in
 * a `THREE.Vector3` themselves.
 */
export function latLngToGlobeXYZ(
  lat: number,
  lng: number,
  altitude: number,
  radius = 100
): { x: number; y: number; z: number } {
  const phi = (90 - lat) * DEG
  const theta = (lng + 180) * DEG
  const r = radius * (1 + altitude)
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  }
}

/**
 * Ease-in-out cubic — the shared "ascent → cruise → descent" pacing curve for
 * flight animations. Kept here so every globe surface's plane feels the same.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export {
  type Coordinates,
  type BoundingBox,
  type GeoCluster
}