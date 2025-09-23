// TypeScript interfaces for react-globe.gl component and related types

import type { Scene, Camera, WebGLRenderer } from 'three'

export interface CityCluster {
  id: string
  latitude: number
  longitude: number
  cities: CityPin[]
  totalAlbums: number
  totalPhotos: number
  radius: number
}

export interface CityPin {
  id: string
  name: string
  latitude: number
  longitude: number
  albumCount: number
  photoCount: number
  visitDate: string
  isVisited: boolean
  isActive?: boolean
}

export interface GlobeInstance {
  pointOfView: {
    (coordinates?: { lat: number; lng: number; altitude: number }, transitionDuration?: number): GlobeInstance;
    (): { lat: number; lng: number; altitude: number };
  }
  scene: () => Scene
  camera: () => Camera
  renderer: () => WebGLRenderer
  controls: () => unknown
}

export interface GlobeHtmlElement {
  lat: number
  lng: number
  size: number
  color: string
  opacity: number
  cluster: CityCluster
  isMultiCity: boolean
  isActive: boolean
  label: string
  albumCount: number
  photoCount: number
}

export interface GlobeLabelData {
  lat: number
  lng: number
  text: string
  size: number
  color: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number
}

export interface GlobeRingData {
  lat: number
  lng: number
  maxR: number
  propagationSpeed: number
  repeatPeriod: number
  color: string
}

export interface GlobePointData {
  lat: number
  lng: number
  size?: number
  color?: string
  [key: string]: unknown
}

// Callback function types for Globe component
export type GlobeHtmlLatCallback = (d: GlobeHtmlElement) => number
export type GlobeHtmlLngCallback = (d: GlobeHtmlElement) => number
export type GlobeHtmlAltitudeCallback = (d: GlobeHtmlElement) => number
export type GlobeHtmlElementCallback = (d: GlobeHtmlElement) => HTMLElement

export type GlobeLabelLatCallback = (d: GlobeLabelData) => number
export type GlobeLabelLngCallback = (d: GlobeLabelData) => number
export type GlobeLabelTextCallback = (d: GlobeLabelData) => string
export type GlobeLabelSizeCallback = (d: GlobeLabelData) => number
export type GlobeLabelColorCallback = (d: GlobeLabelData) => string

export type GlobeRingLatCallback = (d: GlobeRingData) => number
export type GlobeRingLngCallback = (d: GlobeRingData) => number
export type GlobeRingMaxRadiusCallback = (d: GlobeRingData) => number
export type GlobeRingPropagationSpeedCallback = (d: GlobeRingData) => number
export type GlobeRingRepeatPeriodCallback = (d: GlobeRingData) => number
export type GlobeRingColorCallback = (d: GlobeRingData) => string

export type GlobePointLatCallback = (d: GlobePointData) => number
export type GlobePointLngCallback = (d: GlobePointData) => number
export type GlobePointColorCallback = (d: GlobePointData) => string
export type GlobePointLabelCallback = (d: GlobePointData) => string
export type GlobePointClickCallback = (d: GlobePointData) => void

// API Response Types
export interface SupabaseApiResponse<T = unknown> {
  data: T | null
  error: Error | null
}

export interface TravelTimelineApiResponse {
  album_id: string
  title: string
  location_name: string | null
  latitude: number
  longitude: number
  location_type: string
  country_code: string | null
  visit_date: string
  duration_days: number
  sequence_order: number
  photo_count: number
  airport_code: string | null
  timezone: string | null
  island_group: string | null
}

export interface TravelYearsApiResponse {
  year: number
  location_count: number
  photo_count: number
  countries: string[]
}

export interface PhotoApiResponse {
  id: string
  url: string
  caption?: string
}