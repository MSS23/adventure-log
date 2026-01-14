import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useSearchParams } from 'next/navigation'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('@/components/auth/AuthProvider')
jest.mock('next/navigation')
jest.mock('@/lib/utils/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn()
  }
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>
  }
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: unknown }) => <img src={src} alt={alt} {...props} />
}))

// Mock FollowButton
jest.mock('@/components/social/FollowButton', () => ({
  FollowButton: () => <button>Follow</button>
}))

describe('AdvancedSearch', () => {
  const mockSupabase = {
    from: jest.fn(),
    rpc: jest.fn()
  }

  const mockSearchParams = new URLSearchParams()
  const mockGet = jest.fn((key: string) => mockSearchParams.get(key))

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useAuth as jest.Mock).mockReturnValue({ user: { id: 'test-user' } })
    ;(useSearchParams as jest.Mock).mockReturnValue({ get: mockGet })
  })

  describe('Album Search', () => {
    it('should search only in title, location_name, and country_code fields', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockNeq = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'album-1',
            title: 'Italy Adventure',
            location_name: 'Tuscany, Italy',
            country_code: 'IT',
            visibility: 'public',
            cover_photo_url: 'photo.jpg',
            user_id: 'user-1',
            users: { username: 'testuser', display_name: 'Test User' }
          }
        ],
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        neq: mockNeq,
        or: mockOr,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'Italy' } })

      await waitFor(() => {
        // Verify the search query structure
        expect(mockOr).toHaveBeenCalledWith(
          expect.stringContaining('title.ilike.%Italy%,location_name.ilike.%Italy%')
        )
        // Should NOT include description in the search
        expect(mockOr).not.toHaveBeenCalledWith(
          expect.stringContaining('description.ilike')
        )
      }, { timeout: 1000 })
    })

    it('should exclude draft albums from search results', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockNeq = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        neq: mockNeq,
        or: mockOr,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'test' } })

      await waitFor(() => {
        expect(mockNeq).toHaveBeenCalledWith('status', 'draft')
      }, { timeout: 1000 })
    })
  })

  describe('User Search', () => {
    it('should filter out users with null usernames', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          { id: 'user-1', username: 'validuser', display_name: 'Valid User' },
          { id: 'user-2', username: null, display_name: 'Invalid User' }
        ],
        error: null
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: mockSelect,
            or: mockOr,
            not: mockNot,
            limit: mockLimit
          }
        }
        // Return mock for albums
        return {
          select: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'user' } })

      await waitFor(() => {
        // Verify null username filter is applied
        expect(mockNot).toHaveBeenCalledWith('username', 'is', null)
      }, { timeout: 1000 })
    })

    it('should search by username when query starts with @', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [{ id: 'user-1', username: 'testuser', display_name: 'Test User' }],
        error: null
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: mockSelect,
            or: mockOr,
            not: mockNot,
            limit: mockLimit
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: '@testuser' } })

      await waitFor(() => {
        expect(mockOr).toHaveBeenCalledWith(
          expect.stringContaining('username.ilike.%testuser%,display_name.ilike.%testuser%')
        )
      }, { timeout: 1000 })
    })
  })

  describe('Country Search', () => {
    it('should support searching by country name', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockNeq = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'album-1',
            title: 'Rome Visit',
            location_name: 'Rome, Italy',
            country_code: 'IT',
            visibility: 'public',
            cover_photo_url: 'photo.jpg',
            user_id: 'user-1',
            users: { username: 'traveler', display_name: 'Traveler' }
          }
        ],
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        neq: mockNeq,
        or: mockOr,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'italy' } })

      await waitFor(() => {
        // Should search for country code IT when "italy" is entered
        expect(mockOr).toHaveBeenCalledWith(
          expect.stringContaining('country_code.eq.IT')
        )
      }, { timeout: 1000 })
    })

    it('should handle country codes directly', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockNeq = jest.fn().mockReturnThis()
      const mockOr = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        neq: mockNeq,
        or: mockOr,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'IT' } })

      await waitFor(() => {
        // Should treat 2-letter codes as country codes
        expect(mockOr).toHaveBeenCalledWith(
          expect.stringContaining('country_code.eq.IT')
        )
      }, { timeout: 1000 })
    })
  })

  describe('Results Display', () => {
    it('should not display users with invalid data', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [
                { id: 'user-1', username: 'validuser', display_name: 'Valid User' },
                { id: 'user-2', username: null, display_name: null },
                { id: 'user-3', username: '', display_name: '' }
              ],
              error: null
            })
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'test' } })

      await waitFor(() => {
        // Should only display valid user
        expect(screen.queryByText('@validuser')).toBeInTheDocument()
        // Should not display "user not found" or invalid users
        expect(screen.queryByText('user not found')).not.toBeInTheDocument()
        expect(screen.queryByText('Unknown User')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should filter out albums without cover photos', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'album-1',
              title: 'With Photo',
              cover_photo_url: 'photo.jpg',
              visibility: 'public',
              user_id: 'user-1',
              users: { username: 'user1' }
            },
            {
              id: 'album-2',
              title: 'Without Photo',
              cover_photo_url: null,
              visibility: 'public',
              user_id: 'user-2',
              users: { username: 'user2' }
            }
          ],
          error: null
        })
      })

      // Mock likes query
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'likes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          }
        }
        return mockSupabase.from(table)
      })

      render(<AdvancedSearch />)

      const searchInput = screen.getByPlaceholderText('Search adventures, places, travelers...')
      fireEvent.change(searchInput, { target: { value: 'photo' } })

      await waitFor(() => {
        // Should only display album with photo
        expect(screen.queryByText('With Photo')).toBeInTheDocument()
        expect(screen.queryByText('Without Photo')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })
})