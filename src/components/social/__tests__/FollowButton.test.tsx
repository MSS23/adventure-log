import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FollowButton } from '../FollowButton'
import '@testing-library/jest-dom'

// Mock the auth provider
jest.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'current-user-id' },
    profile: { id: 'current-user-id', username: 'currentuser', display_name: 'Current User' }
  })
}))

// Mock the useFollows hook
const mockFollow = jest.fn()
const mockUnfollow = jest.fn()

jest.mock('@/lib/hooks/useFollows', () => ({
  useFollows: (userId: string) => ({
    followStatus: 'not_following',
    follow: mockFollow,
    unfollow: mockUnfollow,
    loading: false,
    stats: {
      followersCount: 0,
      followingCount: 0,
      pendingRequestsCount: 0
    },
    followers: [],
    following: [],
    pendingRequests: [],
    getFollowStatus: jest.fn(),
    refreshStats: jest.fn(),
    refreshFollowLists: jest.fn(),
    followUser: mockFollow,
    unfollowUser: mockUnfollow,
    acceptFollowRequest: jest.fn(),
    rejectFollowRequest: jest.fn(),
    error: null
  })
}))

describe('FollowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent default and stop propagation on click', async () => {
    render(
      <FollowButton
        userId="test-user-id"
        showText={true}
      />
    )

    const button = screen.getByRole('button', { name: /follow/i })

    // Create a mock event with preventDefault and stopPropagation
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    }

    // Simulate click with the mock event
    fireEvent.click(button, mockEvent)

    // Verify that both methods were called
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
  })

  it('should call follow function when clicked', async () => {
    render(
      <FollowButton
        userId="test-user-id"
        showText={true}
      />
    )

    const button = screen.getByRole('button', { name: /follow/i })

    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFollow).toHaveBeenCalledWith('test-user-id')
    })
  })

  it('should not render button for own profile', () => {
    render(
      <FollowButton
        userId="current-user-id"
        showText={true}
      />
    )

    const button = screen.queryByRole('button')
    expect(button).not.toBeInTheDocument()
  })

  it('should work even when nested in a clickable parent', async () => {
    const parentClickHandler = jest.fn()

    render(
      <div onClick={parentClickHandler}>
        <FollowButton
          userId="test-user-id"
          showText={true}
        />
      </div>
    )

    const button = screen.getByRole('button', { name: /follow/i })

    // Create event with propagation tracking
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      isPropagationStopped: false
    }

    // Override stopPropagation to track if it was called
    mockEvent.stopPropagation = jest.fn(() => {
      mockEvent.isPropagationStopped = true
    })

    fireEvent.click(button, mockEvent)

    // The parent handler should not be called due to stopPropagation
    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)

    // Follow action should still be triggered
    await waitFor(() => {
      expect(mockFollow).toHaveBeenCalledWith('test-user-id')
    })
  })

  it('should handle different follow states correctly', () => {
    // Test when following
    const { rerender } = render(
      <FollowButton
        userId="test-user-id"
        showText={true}
      />
    )

    let button = screen.getByRole('button')
    expect(button).toHaveTextContent('Follow')

    // Mock following state
    jest.clearAllMocks()
    jest.spyOn(require('@/lib/hooks/useFollows'), 'useFollows').mockReturnValue({
      followStatus: 'following',
      follow: mockFollow,
      unfollow: mockUnfollow,
      loading: false,
      stats: {
        followersCount: 0,
        followingCount: 0,
        pendingRequestsCount: 0
      },
      followers: [],
      following: [],
      pendingRequests: [],
      getFollowStatus: jest.fn(),
      refreshStats: jest.fn(),
      refreshFollowLists: jest.fn(),
      followUser: mockFollow,
      unfollowUser: mockUnfollow,
      acceptFollowRequest: jest.fn(),
      rejectFollowRequest: jest.fn(),
      error: null
    })

    rerender(
      <FollowButton
        userId="test-user-id"
        showText={true}
      />
    )

    button = screen.getByRole('button')
    expect(button).toHaveTextContent('Following')
  })
})