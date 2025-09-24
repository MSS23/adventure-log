'use client'

import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAsyncOperation } from './useAsyncOperation'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseQueryOptions<T = unknown> {
  component?: string
  action?: string
  enabled?: boolean
  refetchOnMount?: boolean
  staleTime?: number
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

interface SupabaseQueryState {
  enabled: boolean
  key: string
  lastFetch: number
  staleTime: number
}

/**
 * Hook for standardized Supabase data fetching with caching and error handling
 * Built on top of useAsyncOperation for consistent state management
 */
export function useSupabaseQuery<T = unknown>(
  queryKey: string[],
  queryFn: (supabase: SupabaseClient, signal?: AbortSignal) => Promise<T>,
  options: SupabaseQueryOptions<T> = {}
) {
  const {
    component = 'Unknown',
    action = queryKey.join('-'),
    enabled = true,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError
  } = options

  const key = queryKey.join(':')

  const asyncOperation = useAsyncOperation<T>({
    component,
    action,
    onSuccess,
    onError
  })

  const supabase = useMemo(() => createClient(), [])

  const queryState = useMemo<SupabaseQueryState>(() => ({
    enabled,
    key,
    lastFetch: 0,
    staleTime
  }), [enabled, key, staleTime])

  const isStale = useCallback(() => {
    if (!asyncOperation.initialized) return true
    return Date.now() - queryState.lastFetch > queryState.staleTime
  }, [asyncOperation.initialized, queryState.lastFetch, queryState.staleTime])

  const fetch = useCallback(async (force = false) => {
    if (!queryState.enabled) return

    if (!force && !isStale() && asyncOperation.hasData) {
      return asyncOperation.data
    }

    return asyncOperation.execute(
      (signal) => queryFn(supabase, signal),
      `fetch-${action}`
    )
  }, [queryState.enabled, isStale, asyncOperation, queryFn, supabase, action])

  const refetch = useCallback(() => {
    return fetch(true)
  }, [fetch])

  // Auto-fetch on mount if enabled
  useMemo(() => {
    if (queryState.enabled && refetchOnMount) {
      fetch()
    }
  }, [queryState.enabled, refetchOnMount, fetch])

  return {
    ...asyncOperation,
    fetch,
    refetch,
    isStale: isStale(),
    enabled: queryState.enabled,
    key: queryState.key
  }
}

/**
 * Hook for Supabase table queries with common patterns
 */
export function useSupabaseTable<T = unknown>(
  table: string,
  options: SupabaseQueryOptions<T> & {
    select?: string
    filters?: Record<string, unknown>
    orderBy?: { column: string, ascending?: boolean }
    limit?: number
    single?: boolean
  } = {}
) {
  const {
    select = '*',
    filters = {},
    orderBy,
    limit,
    single = false,
    ...queryOptions
  } = options

  const queryKey = useMemo(() => {
    const key = [table, select]

    // Add filters to key
    Object.entries(filters).forEach(([filterKey, value]) => {
      key.push(`${filterKey}:${value}`)
    })

    if (orderBy) {
      key.push(`order:${orderBy.column}:${orderBy.ascending ? 'asc' : 'desc'}`)
    }

    if (limit) {
      key.push(`limit:${limit}`)
    }

    if (single) {
      key.push('single')
    }

    return key
  }, [table, select, filters, orderBy, limit, single])

  const queryFn = useCallback(async (supabase: SupabaseClient) => {
    let query = supabase.from(table).select(select)

    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(column, value)
      }
    })

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending !== false })
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }

    // Execute query
    let result
    if (single) {
      result = await query.maybeSingle()
    } else {
      result = await query
    }

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data as T
  }, [table, select, filters, orderBy, limit, single])

  return useSupabaseQuery<T>(queryKey, queryFn, queryOptions)
}

/**
 * Hook for Supabase RPC function calls
 */
export function useSupabaseRPC<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: SupabaseQueryOptions<T> = {}
) {
  const queryKey = useMemo(() => {
    const key = ['rpc', functionName]
    Object.entries(params).forEach(([paramKey, value]) => {
      key.push(`${paramKey}:${value}`)
    })
    return key
  }, [functionName, params])

  const queryFn = useCallback(async (supabase: SupabaseClient) => {
    const { data, error } = await supabase.rpc(functionName, params)

    if (error) {
      throw new Error(error.message)
    }

    return data
  }, [functionName, params])

  return useSupabaseQuery<T>(queryKey, queryFn, options)
}

/**
 * Hook for real-time Supabase subscriptions
 */
export function useSupabaseSubscription<T = unknown>(
  table: string,
  options: {
    filter?: string
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    onInsert?: (payload: T) => void
    onUpdate?: (payload: T) => void
    onDelete?: (payload: T) => void
    enabled?: boolean
  } = {}
) {
  const {
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    enabled = true
  } = options

  const supabase = useMemo(() => createClient(), [])

  const subscribe = useCallback(() => {
    if (!enabled) return

    // TODO: Fix Supabase realtime subscription API
    // const subscription = supabase
    //   .channel(`${table}-changes`)
    //   .on('postgres_changes',
    //     { event, schema: 'public', table, filter },
    //     (payload: any) => {
    //       switch (payload.eventType) {
    //         case 'INSERT':
    //           onInsert?.(payload)
    //           break
    //         case 'UPDATE':
    //           onUpdate?.(payload)
    //           break
    //         case 'DELETE':
    //           onDelete?.(payload)
    //           break
    //       }
    //     }
    //   )
    //   .subscribe()

    // return () => {
    //   subscription.unsubscribe()
    // }
  }, [enabled, onInsert, onUpdate, onDelete])

  useMemo(() => {
    if (enabled) {
      return subscribe()
    }
  }, [enabled, subscribe])

  return {
    subscribe,
    enabled
  }
}

/**
 * Hook for mutations with optimistic updates
 */
export function useSupabaseMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (supabase: SupabaseClient, variables: TVariables) => Promise<TData>,
  options: {
    component?: string
    action?: string
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: string, variables: TVariables) => void
    onSettled?: (data: TData | undefined, error: string | null, variables: TVariables) => void
  } = {}
) {
  const {
    component = 'Unknown',
    action = 'mutation',
    onSuccess,
    onError,
    onSettled
  } = options

  const asyncOperation = useAsyncOperation<TData>({
    component,
    action
  })

  const supabase = useMemo(() => createClient(), [])

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      const result = await asyncOperation.execute(
        () => mutationFn(supabase, variables),
        action
      )
      if (result !== undefined) {
        onSuccess?.(result, variables)
        onSettled?.(result, null, variables)
        return result
      }
      return undefined
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mutation failed'
      onError?.(errorMessage, variables)
      onSettled?.(undefined, errorMessage, variables)
      throw error
    }
  }, [asyncOperation, mutationFn, supabase, action, onSuccess, onError, onSettled])

  return {
    ...asyncOperation,
    mutate,
    mutateAsync: mutate
  }
}