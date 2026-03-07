import { renderHook, waitFor } from '@testing-library/react'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' }
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: mockData, error: null })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    const queryFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() =>
      useSupabaseQuery(['test'], queryFn, { component: 'Test', action: 'fetch' })
    )

    await waitFor(() => {
      expect(result.current.hasData).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors', async () => {
    const mockError = new Error('Test error')
    const mockSupabase = {}

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    const queryFn = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() =>
      useSupabaseQuery(['test'], queryFn, { component: 'Test', action: 'fetch' })
    )

    await waitFor(() => {
      expect(result.current.hasError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.loading).toBe(false)
  })

  it('should respect enabled flag', async () => {
    const queryFn = jest.fn()

    const { result } = renderHook(() =>
      useSupabaseQuery(['test'], queryFn, {
        component: 'Test',
        action: 'fetch',
        enabled: false
      })
    )

    await waitFor(() => {
      expect(result.current.enabled).toBe(false)
    })

    expect(queryFn).not.toHaveBeenCalled()
  })
})
