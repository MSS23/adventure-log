/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'

// Mock Supabase channel
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
}

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockMaybeSingle = jest.fn()
const mockSingle = jest.fn()

function createChainable() {
  const chain: Record<string, jest.Mock> = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  }

  // Make each method return the chain
  for (const fn of Object.values(chain)) {
    fn.mockReturnValue(chain)
  }

  return chain
}

const queryChain = createChainable()

const mockSupabaseClient = {
  from: jest.fn().mockReturnValue(queryChain),
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

const mockUser = { id: 'current-user-123', email: 'me@test.com' }

jest.mock('@/components/auth/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
    profile: { id: mockUser.id, username: 'testuser' }
  }))
}))

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { useFollows } from '@/lib/hooks/useFollows'

describe('useFollows', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset chain methods
    for (const fn of Object.values(queryChain)) {
      fn.mockReturnValue(queryChain)
    }

    // Default: select with count returns 0
    mockSelect.mockReturnValue({
      ...queryChain,
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, data: [], error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    // Channel mock
    mockChannel.on.mockReturnThis()
    mockChannel.subscribe.mockReturnThis()
  })

  it('should return initial state with not_following status', () => {
    const { result } = renderHook(() => useFollows())

    expect(result.current.followStatus).toBe('not_following')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.stats).toEqual({
      followersCount: 0,
      followingCount: 0,
      pendingRequestsCount: 0,
    })
  })

  it('should have follow and unfollow functions', () => {
    const { result } = renderHook(() => useFollows())

    expect(typeof result.current.follow).toBe('function')
    expect(typeof result.current.unfollow).toBe('function')
    expect(typeof result.current.followUser).toBe('function')
    expect(typeof result.current.unfollowUser).toBe('function')
  })

  it('should have accept and reject follow request functions', () => {
    const { result } = renderHook(() => useFollows())

    expect(typeof result.current.acceptFollowRequest).toBe('function')
    expect(typeof result.current.rejectFollowRequest).toBe('function')
  })

  it('should expose followers, following, and pending lists', () => {
    const { result } = renderHook(() => useFollows())

    expect(Array.isArray(result.current.followers)).toBe(true)
    expect(Array.isArray(result.current.following)).toBe(true)
    expect(Array.isArray(result.current.pendingRequests)).toBe(true)
  })

  it('should provide getFollowStatus method', () => {
    const { result } = renderHook(() => useFollows())

    expect(typeof result.current.getFollowStatus).toBe('function')
  })

  it('should provide refresh methods', () => {
    const { result } = renderHook(() => useFollows())

    expect(typeof result.current.refreshStats).toBe('function')
    expect(typeof result.current.refreshFollowLists).toBe('function')
  })

  it('should alias followUser to follow and unfollowUser to unfollow', () => {
    const { result } = renderHook(() => useFollows())

    expect(result.current.followUser).toBe(result.current.follow)
    expect(result.current.unfollowUser).toBe(result.current.unfollow)
  })

  describe('getFollowStatus', () => {
    it('should return not_following for same user', async () => {
      const { result } = renderHook(() => useFollows())

      const status = await result.current.getFollowStatus('current-user-123')
      expect(status).toBe('not_following')
    })
  })
})
