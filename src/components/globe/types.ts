// Shared type definitions for globe component internals

export interface FlightPath {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  endColor: string
  year: number
  name: string
  distance: number // great-circle distance in degrees, used for altitude
  index: number // chronological position, used for opacity
  total: number // total paths, used for opacity
  isTrail?: boolean // true = subtle static trail, false = bright animated plane dot
}

// Type definitions for accessing Three.js renderer internals
export interface GlobeInternals {
  scene?: () => unknown
  renderer?: () => ThreeRenderer | undefined
}

export interface ThreeRenderer {
  setAnimationLoop: (callback: ((time: number) => void) | null) => void
  setPixelRatio?: (ratio: number) => void
}

export interface OrbitControls {
  enabled: boolean
  update?: () => void
}

export interface PerformanceConfig {
  showAtmosphere: boolean
  atmosphereOpacity: number
  atmosphereAltitude: number
  arcStroke: number
  showArcs: boolean
  pinSize: number
  maxPins: number
  arcCurveResolution: number
  arcCircularResolution: number
  solidArcs: boolean
}

export type PerformanceMode = 'auto' | 'high' | 'balanced' | 'low'
export type EffectivePerformanceMode = 'high' | 'balanced' | 'low'
