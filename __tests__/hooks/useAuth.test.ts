import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('useAuthActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should sign in successfully', async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      }
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    const { result } = renderHook(() => useAuthActions())

    await act(async () => {
      await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('should handle sign in errors', async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid credentials' }
        })
      }
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    const { result } = renderHook(() => useAuthActions())

    await act(async () => {
      await result.current.signIn({
        email: 'test@example.com',
        password: 'wrong',
        rememberMe: false
      })
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.loading).toBe(false)
  })
})
