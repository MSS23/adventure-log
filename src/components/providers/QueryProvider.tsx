'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a client with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long data is considered fresh
            staleTime: 5 * 60 * 1000, // 5 minutes (matches AuthProvider cache)
            // Cache time: how long inactive data is kept in memory
            gcTime: 10 * 60 * 1000, // 10 minutes
            // Retry failed requests
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus for data freshness
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
          },
          mutations: {
            // Retry mutations only for network errors
            retry: (failureCount, error: unknown) => {
              const err = error as { code?: string }
              if (err?.code === 'NETWORK_ERROR' && failureCount < 2) {
                return true
              }
              return false
            },
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
