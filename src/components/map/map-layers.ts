/**
 * Shared types + layer metadata for the /map page.
 *
 * Lives in its own Leaflet-free module ON PURPOSE: the page statically
 * imports these, and ExploreMap (which imports leaflet at module scope) must
 * only ever load through next/dynamic({ ssr: false }) — a direct value import
 * from ExploreMap would execute Leaflet during server prerender and break the
 * build.
 */

export type MapLayerKind = 'friends' | 'wishlist' | 'recs'

export interface ExploreMapPin {
  id: string
  kind: MapLayerKind
  latitude: number
  longitude: number
  title: string
  subtitle?: string
  /** Internal app link (canonical web path — the native adapter rewrites it). */
  href?: string
  hrefLabel?: string
  /** External source link (e.g. the original TikTok). Sanitized before render. */
  externalUrl?: string | null
}

export interface FlyTarget {
  lat: number
  lng: number
  zoom?: number
  /** Bump to re-trigger the same coordinates (e.g. repeated "locate me"). */
  ts: number
}

// 'saved' layer removed in migration 67 — saved places ARE wishlist items now.
// Iteration order here is also the pill order on /map.
export const LAYER_META: Record<MapLayerKind, { label: string; color: string }> = {
  friends: { label: 'Friends', color: '#5B5BD6' },
  wishlist: { label: 'Wishlist', color: '#B96800' },
  recs: { label: 'Friends recommend', color: '#C2416C' },
}
