'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'

export type PlaceCategory = 'see' | 'eat' | 'do' | 'stay' | 'other'
export type SourcePlatform = 'manual' | 'tiktok' | 'google_maps' | 'instagram' | 'other'

export interface SavedPlace {
  id: string
  user_id: string
  place_name: string
  location_name: string | null
  city: string | null
  country_code: string | null
  latitude: number
  longitude: number
  category: PlaceCategory
  notes: string | null
  source_platform: SourcePlatform
  source_url: string | null
  thumbnail_url: string | null
  created_at: string
  visited_at: string | null
}

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

export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioned, setProvisioned] = useState(true)
  const { user } = useAuth()

  const fetchPlaces = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await apiFetch('/api/saved-places')
      if (!res.ok) throw new Error('Failed to fetch saved places')
      const data = await res.json()
      setPlaces(data.items || [])
      if (typeof data.provisioned === 'boolean') setProvisioned(data.provisioned)
    } catch (error) {
      log.error('Failed to fetch saved places', { component: 'useSavedPlaces', action: 'fetch' }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  /** Resolve a pasted link into reviewable place candidates (does not save). */
  const extractFromLink = useCallback(async (url: string): Promise<ExtractResult> => {
    const res = await apiFetch('/api/saved-places/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Could not read that link')
    }
    return res.json()
  }, [])

  const addPlace = useCallback(async (params: AddPlaceParams): Promise<SavedPlace> => {
    const res = await apiFetch('/api/saved-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to save place')
    }
    const { item } = await res.json()
    setPlaces((prev) => [item, ...prev])
    return item
  }, [])

  const removePlace = useCallback(async (id: string): Promise<void> => {
    // Optimistic remove with rollback on failure.
    const prev = places
    setPlaces((p) => p.filter((x) => x.id !== id))
    try {
      const res = await apiFetch(`/api/saved-places/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove place')
    } catch (error) {
      setPlaces(prev)
      throw error
    }
  }, [places])

  const updatePlace = useCallback(
    async (id: string, updates: Partial<Pick<SavedPlace, 'category' | 'notes' | 'visited_at' | 'place_name'>>): Promise<SavedPlace | null> => {
      const res = await apiFetch(`/api/saved-places/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update place')
      }
      const { item } = await res.json()
      setPlaces((prev) => prev.map((x) => (x.id === id ? item : x)))
      return item
    },
    []
  )

  return {
    places,
    loading,
    provisioned,
    fetchPlaces,
    extractFromLink,
    addPlace,
    removePlace,
    updatePlace,
  }
}
