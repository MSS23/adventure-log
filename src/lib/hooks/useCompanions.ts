'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import type { TravelProfile, CompanionRequest } from '@/types/database'
import { log } from '@/lib/utils/logger'

// Extended types for matched profiles
export interface CompanionMatch extends Omit<TravelProfile, 'user'> {
  user?: {
    id: string
    name?: string
    username?: string
    display_name?: string
    avatar_url?: string
    bio?: string
    location?: string
  }
  compatibility_score: number
  shared_styles: string[]
  shared_interests: string[]
  shared_destinations: string[]
}

export interface CompanionRequestWithUser extends Omit<CompanionRequest, 'sender' | 'receiver'> {
  sender?: {
    id: string
    name?: string
    username?: string
    display_name?: string
    avatar_url?: string
    bio?: string
    location?: string
  }
  receiver?: {
    id: string
    name?: string
    username?: string
    display_name?: string
    avatar_url?: string
    bio?: string
    location?: string
  }
}

/**
 * Hook to get/create the current user's travel profile
 */
export function useTravelProfile() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['travel-profile', user?.id],
    queryFn: async (): Promise<TravelProfile | null> => {
      if (!user) return null

      const { data, error } = await supabase
        .from('travel_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return null
        }
        log.error('Failed to fetch travel profile', {
          component: 'useCompanions',
          action: 'fetch-profile',
          userId: user.id,
        }, error)
        throw error
      }

      return data
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to get matched companion profiles
 */
export function useCompanionMatches() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['companion-matches', user?.id],
    queryFn: async (): Promise<CompanionMatch[]> => {
      const response = await fetch('/api/companions')
      if (!response.ok) {
        throw new Error('Failed to fetch companion matches')
      }
      const result = await response.json()
      return result.data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to get incoming and outgoing companion requests
 */
export function useCompanionRequests() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['companion-requests', user?.id],
    queryFn: async (): Promise<{
      incoming: CompanionRequestWithUser[]
      outgoing: CompanionRequestWithUser[]
    }> => {
      const response = await fetch('/api/companions/requests')
      if (!response.ok) {
        throw new Error('Failed to fetch companion requests')
      }
      const result = await response.json()
      return result.data || { incoming: [], outgoing: [] }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to send a companion request
 */
export function useSendCompanionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      receiver_id: string
      destination?: string
      date_start?: string
      date_end?: string
      message?: string
    }) => {
      const response = await fetch('/api/companions/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send request')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companion-requests'] })
      queryClient.invalidateQueries({ queryKey: ['companion-matches'] })
    },
    onError: (error) => {
      log.error('Failed to send companion request', {
        component: 'useCompanions',
        action: 'send-request',
      }, error)
    },
  })
}

/**
 * Hook to respond to a companion request (accept/decline/cancel)
 */
export function useRespondToRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      request_id: string
      status: 'accepted' | 'declined' | 'cancelled'
    }) => {
      const response = await fetch('/api/companions/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update request')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companion-requests'] })
    },
    onError: (error) => {
      log.error('Failed to respond to companion request', {
        component: 'useCompanions',
        action: 'respond-request',
      }, error)
    },
  })
}

/**
 * Hook to create or update travel profile
 */
export function useUpdateTravelProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (profileData: Partial<TravelProfile>) => {
      const response = await fetch('/api/companions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save profile')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-profile', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['companion-matches'] })
    },
    onError: (error) => {
      log.error('Failed to update travel profile', {
        component: 'useCompanions',
        action: 'update-profile',
      }, error)
    },
  })
}
