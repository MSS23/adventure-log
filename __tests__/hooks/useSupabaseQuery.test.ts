import { renderHook, act } from '@testing-library/react'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')
jest.mock('@/lib/utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}))

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue({})
  })

  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' }
    const queryFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() =>
      useSupabaseQuery(['test-success'], queryFn, {
        component: 'Test',
        action: 'fetch',
        refetchOnMount: false
      })
    )

    await act(async () => {
      await result.current.fetch(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(queryFn).toHaveBeenCalled()
  })

  it('should handle errors', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('Test error'))

    const { result } = renderHook(() =>
      useSupabaseQuery(['test-error'], queryFn, {
        component: 'Test',
        action: 'fetch',
        refetchOnMount: false
      })
    )

    await act(async () => {
      try {
        await result.current.fetch(true)
      } catch {
        // Error is expected and handled by asyncOperation state
      }
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.loading).toBe(false)
  })

  it('should respect enabled flag', async () => {
    const queryFn = jest.fn().mockResolvedValue({ test: true })

    const { result } = renderHook(() =>
      useSupabaseQuery(['test-disabled'], queryFn, {
        component: 'Test',
        action: 'fetch',
        enabled: false
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.enabled).toBe(false)
    expect(queryFn).not.toHaveBeenCalled()
  })
})
