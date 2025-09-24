'use client'

import { useState, useCallback, useRef } from 'react'
import { log } from '@/lib/utils/logger'

interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: string | null
  initialized: boolean
}

interface AsyncOperationOptions<T = unknown> {
  component?: string
  action?: string
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  resetErrorOnRetry?: boolean
}

/**
 * A reusable hook for managing async operations with standardized loading/error states
 * Helps reduce code duplication across components that fetch data
 */
export function useAsyncOperation<T = unknown>(
  options: AsyncOperationOptions<T> = {}
) {
  const {
    component = 'Unknown',
    action = 'async-operation',
    onSuccess,
    onError,
    resetErrorOnRetry = true
  } = options

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    initialized: false
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (
    operation: (signal?: AbortSignal) => Promise<T>,
    operationName?: string
  ) => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const actionName = operationName || action

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: resetErrorOnRetry ? null : prev.error
      }))

      log.info(`Starting ${actionName}`, {
        component,
        action: actionName,
        timestamp: new Date().toISOString()
      })

      const result = await operation(controller.signal)

      // Check if operation was aborted
      if (controller.signal.aborted) {
        return
      }

      log.info(`${actionName} completed successfully`, {
        component,
        action: actionName,
        hasData: !!result
      })

      setState({
        data: result,
        loading: false,
        error: null,
        initialized: true
      })

      onSuccess?.(result)
      return result

    } catch (error: unknown) {
      // Ignore abortion errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'

      log.error(`${actionName} failed`, {
        component,
        action: actionName,
        error: errorMessage
      }, error)

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        initialized: true
      }))

      onError?.(errorMessage)
      throw error
    }
  }, [component, action, onSuccess, onError, resetErrorOnRetry])

  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      data: null,
      loading: false,
      error: null,
      initialized: false
    })
  }, [])

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      initialized: true
    }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }))
  }, [])

  const retry = useCallback(async (
    operation: (signal?: AbortSignal) => Promise<T>
  ) => {
    return execute(operation, `${action}-retry`)
  }, [execute, action])

  return {
    // State
    ...state,

    // Actions
    execute,
    reset,
    setData,
    setError,
    retry,

    // Computed properties
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
    isInitialized: state.initialized,
    isEmpty: state.initialized && !state.data,
  }
}

/**
 * Hook for operations that return arrays/lists
 * Provides additional convenience methods for list operations
 */
export function useAsyncList<T = unknown>(
  options: AsyncOperationOptions<T[]> = {}
) {
  const operation = useAsyncOperation<T[]>(options)

  const addItem = useCallback((item: T) => {
    operation.setData([...(operation.data || []), item])
  }, [operation])

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    if (!operation.data) return
    operation.setData(operation.data.filter(item => !predicate(item)))
  }, [operation])

  const updateItem = useCallback((predicate: (item: T) => boolean, updater: (item: T) => T) => {
    if (!operation.data) return
    operation.setData(
      operation.data.map(item => predicate(item) ? updater(item) : item)
    )
  }, [operation])

  return {
    ...operation,
    addItem,
    removeItem,
    updateItem,
    count: operation.data?.length || 0,
    isEmpty: operation.isInitialized && (!operation.data || operation.data.length === 0),
  }
}

/**
 * Hook specifically for paginated operations
 * Manages pagination state and loading more data
 */
export function useAsyncPagination<T = unknown>(
  options: AsyncOperationOptions<T[]> = {}
) {
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const operation = useAsyncList<T>(options)

  const loadMore = useCallback(async (
    operationFn: (page: number, signal?: AbortSignal) => Promise<{ data: T[], hasMore: boolean }>
  ) => {
    if (!hasMore || loadingMore) return

    try {
      setLoadingMore(true)

      const result = await operationFn(page + 1)

      setPage(prev => prev + 1)
      setHasMore(result.hasMore)

      // Append new data to existing data
      operation.setData([...(operation.data || []), ...result.data])

      return result
    } catch (error) {
      throw error
    } finally {
      setLoadingMore(false)
    }
  }, [page, hasMore, loadingMore, operation])

  const resetPagination = useCallback(() => {
    setPage(1)
    setHasMore(true)
    setLoadingMore(false)
    operation.reset()
  }, [operation])

  return {
    ...operation,
    page,
    hasMore,
    loadingMore,
    loadMore,
    resetPagination,
  }
}