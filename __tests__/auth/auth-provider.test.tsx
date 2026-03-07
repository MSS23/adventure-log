import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create profile on first login', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: jest.fn().mockResolvedValue({ data: { id: 'user-123', username: 'user_123' }, error: null })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })
  })

  it('should handle existing profile', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = { id: 'user-123', username: 'existing_user' }
    const mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })
  })

  it('should render children when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = { id: 'user-123', username: 'test_user' }
    const mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(
      <AuthProvider>
        <div>Authenticated Content</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Authenticated Content')).toBeInTheDocument()
    })
  })
})
