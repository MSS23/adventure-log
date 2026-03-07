'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CheckIn, CheckInMood } from '@/types/database'

interface CheckInFilters {
  userId?: string
  country?: string
  mood?: CheckInMood
  limit?: number
  offset?: number
}

interface CheckInListResponse {
  check_ins: CheckIn[]
  total: number
  has_more: boolean
}

interface CreateCheckInData {
  location_name: string
  location_address?: string
  latitude: number
  longitude: number
  country_code?: string
  note?: string
  mood?: CheckInMood
  photo_url?: string
  visibility?: 'public' | 'friends' | 'private'
  album_id?: string
}

async function fetchCheckIns(filters: CheckInFilters): Promise<CheckInListResponse> {
  const params = new URLSearchParams()
  if (filters.userId) params.set('user_id', filters.userId)
  if (filters.country) params.set('country', filters.country)
  if (filters.mood) params.set('mood', filters.mood)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const res = await fetch(`/api/check-ins?${params.toString()}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch check-ins')
  }
  return res.json()
}

export function useCheckIns(filters: CheckInFilters = {}) {
  return useQuery({
    queryKey: ['check-ins', filters],
    queryFn: () => fetchCheckIns(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCheckInData) => {
      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create check-in')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] })
    },
  })
}

export function useDeleteCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/check-ins?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete check-in')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] })
    },
  })
}
