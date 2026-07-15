/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import type { PlaceRecommendation } from '@/types/database'

// --- Boundary mocks (match the project's component-test conventions) ---

// framer-motion: strip animation-only props so the DOM stays clean.
jest.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      whileTap: _whileTap,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  useReducedMotion: () => false,
}))

// next/navigation — router.push is the assertion target for logged-out bump.
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/explore/recommendations',
}))

// Auth — toggled per-test via mockUser.
let mockUser: { id: string } | null = { id: 'viewer-1' }
jest.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// The bump mutation — we don't exercise React Query here, just the call.
const mockMutate = jest.fn()
const mockComplete = jest.fn()
let mockIsPending = false
jest.mock('@/lib/hooks/usePlaceRecommendations', () => ({
  useToggleBump: () => ({ mutate: mockMutate, isPending: mockIsPending }),
  useToggleRecommendationCompletion: () => ({ mutate: mockComplete, isPending: false }),
}))

// getPhotoUrl — return null so the card renders the initial-avatar fallback.
jest.mock('@/lib/utils/photo-url', () => ({
  getPhotoUrl: jest.fn(() => null),
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { RecommendationCard } from '@/components/recommendations/RecommendationCard'

function makeRec(overrides: Partial<PlaceRecommendation> = {}): PlaceRecommendation {
  return {
    id: 'rec-1',
    created_by: 'author-1',
    title: 'Best Ramen in Shibuya',
    place_type: 'eat',
    tip: 'Go before noon to skip the line.',
    city: 'Tokyo',
    country_code: 'JP',
    location_name: null,
    latitude: 35.6,
    longitude: 139.6,
    bump_count: 12,
    has_bumped: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user: {
      id: 'author-1',
      username: 'tokyofoodie',
      display_name: 'Tokyo Foodie',
    } as PlaceRecommendation['user'],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser = { id: 'viewer-1' }
  mockIsPending = false
})

describe('RecommendationCard', () => {
  it('renders title, location, bump count and creator', () => {
    render(<RecommendationCard recommendation={makeRec()} />)

    expect(screen.getByText('Best Ramen in Shibuya')).toBeInTheDocument()
    expect(screen.getByText('Tokyo · JP')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Tokyo Foodie')).toBeInTheDocument()
  })

  it('renders the place-type label badge', () => {
    render(<RecommendationCard recommendation={makeRec({ place_type: 'eat' })} />)
    expect(screen.getByText('Eat')).toBeInTheDocument()
  })

  it('renders the tip when present', () => {
    render(<RecommendationCard recommendation={makeRec()} />)
    expect(screen.getByText('Go before noon to skip the line.')).toBeInTheDocument()
  })

  it('bumps via the mutation when a logged-in user clicks', () => {
    render(<RecommendationCard recommendation={makeRec()} />)

    const button = screen.getByRole('button', { name: /Bump Best Ramen in Shibuya/i })
    fireEvent.click(button)

    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate).toHaveBeenCalledWith({ id: 'rec-1' })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects a logged-out visitor to login (with redirect back) instead of bumping', () => {
    mockUser = null
    render(<RecommendationCard recommendation={makeRec()} />)

    const button = screen.getByRole('button', { name: /Bump Best Ramen in Shibuya/i })
    fireEvent.click(button)

    expect(mockMutate).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith(
      `/login?redirectTo=${encodeURIComponent('/explore/recommendations')}`
    )
  })

  it('reflects bumped state via aria-pressed and a "remove" label', () => {
    render(<RecommendationCard recommendation={makeRec({ has_bumped: true })} />)

    const button = screen.getByRole('button', { name: /Remove your bump/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('falls back to a creator initial when no avatar/display name resolves', () => {
    render(
      <RecommendationCard
        recommendation={makeRec({
          user: undefined,
          users: undefined,
          profiles: undefined,
        })}
      />
    )
    // getCreator() returns undefined -> creatorName 'A traveler' -> initial 'A'.
    expect(screen.getByText('A traveler')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
