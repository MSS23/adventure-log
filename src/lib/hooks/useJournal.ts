'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { JournalEntry } from '@/types/database'

interface JournalFilters {
  status?: 'all' | 'draft' | 'published' | 'archived'
  tag?: string
  limit?: number
  offset?: number
}

interface JournalListResponse {
  entries: JournalEntry[]
  total: number
  has_more: boolean
}

interface JournalEntryResponse {
  entry: JournalEntry
}

interface CreateJournalEntryData {
  title: string
  content?: string
  excerpt?: string
  cover_image_url?: string
  location_name?: string
  latitude?: number
  longitude?: number
  country_code?: string
  album_id?: string
  tags?: string[]
  status?: 'draft' | 'published'
  visibility?: 'public' | 'friends' | 'private'
}

interface UpdateJournalEntryData extends Partial<CreateJournalEntryData> {
  id: string
}

async function fetchJournalEntries(filters: JournalFilters): Promise<JournalListResponse> {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const res = await fetch(`/api/journal?${params.toString()}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch journal entries')
  }
  return res.json()
}

async function fetchJournalEntry(id: string): Promise<JournalEntryResponse> {
  const res = await fetch(`/api/journal/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch journal entry')
  }
  return res.json()
}

export function useJournalEntries(filters: JournalFilters = {}) {
  return useQuery({
    queryKey: ['journal', 'entries', filters],
    queryFn: () => fetchJournalEntries(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useJournalEntry(id: string | null) {
  return useQuery({
    queryKey: ['journal', 'entry', id],
    queryFn: () => fetchJournalEntry(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateJournalEntryData) => {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create journal entry')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    },
  })
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateJournalEntryData) => {
      const { id, ...updates } = data
      const res = await fetch(`/api/journal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update journal entry')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
      queryClient.invalidateQueries({ queryKey: ['journal', 'entry', variables.id] })
    },
  })
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete journal entry')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] })
    },
  })
}
