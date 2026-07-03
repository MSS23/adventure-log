/**
 * Shared types for the "save a place from a link" flow (TikTok / Google Maps
 * / Instagram → geocoded place candidates → wishlist item).
 *
 * Lived in useSavedPlaces.ts until saved_places was merged into
 * wishlist_items (migration 67) — the extract flow now feeds the wishlist.
 */

export type PlaceCategory = 'see' | 'eat' | 'do' | 'stay' | 'other'
export type SourcePlatform = 'manual' | 'tiktok' | 'google_maps' | 'instagram' | 'other'

/** A geocoded candidate returned by the extract endpoint. */
export interface PlaceCandidate {
  placeName: string
  locationName: string
  city: string | null
  countryCode: string | null
  latitude: number
  longitude: number
  category: PlaceCategory
  confidence: number
}

export interface ExtractResult {
  platform: SourcePlatform
  sourceUrl: string
  thumbnailUrl: string | null
  caption: string | null
  candidates: PlaceCandidate[]
  detectedNames: string[]
  needsManual: boolean
  message?: string
}

/** Payload the review modal emits when the user confirms a place. */
export interface AddPlaceParams {
  place_name: string
  location_name?: string | null
  city?: string | null
  country_code?: string | null
  latitude: number
  longitude: number
  category?: PlaceCategory
  notes?: string | null
  source_platform?: SourcePlatform
  source_url?: string | null
  thumbnail_url?: string | null
}
