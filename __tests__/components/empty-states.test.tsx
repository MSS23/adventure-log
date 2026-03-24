/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: Object.assign(React.forwardRef(function MotionDiv({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) {
      // Filter out framer-motion specific props
      const validProps: Record<string, unknown> = {}
      const invalidProps = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'whileInView', 'viewport']
      for (const [key, value] of Object.entries(props)) {
        if (!invalidProps.includes(key)) {
          validProps[key] = value
        }
      }
      return <div ref={ref} {...validProps}>{children}</div>
    }), { displayName: 'MotionDiv' }),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock spring configs
jest.mock('@/lib/animations/spring-configs', () => ({
  transitions: {
    natural: { type: 'spring', stiffness: 100, damping: 15 },
    gentle: { type: 'spring', stiffness: 80, damping: 20 },
  }
}))

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' ')
}))

import {
  EnhancedEmptyState,
  NoAlbumsEmptyState,
  NoFeedEmptyState,
  GlobeEmptyState,
  NoSavedEmptyState,
  NoNotificationsEmptyState,
} from '@/components/ui/enhanced-empty-state'

describe('Empty State Components', () => {
  describe('NoAlbumsEmptyState', () => {
    it('should render title and description', () => {
      render(<NoAlbumsEmptyState />)

      expect(screen.getByText('No Adventures Yet')).toBeInTheDocument()
      expect(screen.getByText(/Start documenting your travels/)).toBeInTheDocument()
    })

    it('should call onCreateAlbum when action button is clicked', () => {
      const handleCreate = jest.fn()
      render(<NoAlbumsEmptyState onCreateAlbum={handleCreate} />)

      fireEvent.click(screen.getByText('Create Album'))
      expect(handleCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('NoFeedEmptyState', () => {
    it('should render title and description', () => {
      render(<NoFeedEmptyState />)

      expect(screen.getByText('Your Feed is Empty')).toBeInTheDocument()
      expect(screen.getByText(/Follow other travelers/)).toBeInTheDocument()
    })

    it('should call onExplore when Explore button is clicked', () => {
      const handleExplore = jest.fn()
      render(<NoFeedEmptyState onExplore={handleExplore} />)

      fireEvent.click(screen.getByText('Explore'))
      expect(handleExplore).toHaveBeenCalledTimes(1)
    })
  })

  describe('GlobeEmptyState', () => {
    it('should render "Your World Awaits"', () => {
      render(<GlobeEmptyState />)

      expect(screen.getByText('Your World Awaits')).toBeInTheDocument()
      expect(screen.getByText(/Create albums with locations/)).toBeInTheDocument()
    })
  })

  describe('NoSavedEmptyState', () => {
    it('should render title and description', () => {
      render(<NoSavedEmptyState />)

      expect(screen.getByText('Nothing Saved')).toBeInTheDocument()
      expect(screen.getByText(/Save albums you want to revisit/)).toBeInTheDocument()
    })

    it('should call onExplore when Explore Albums button is clicked', () => {
      const handleExplore = jest.fn()
      render(<NoSavedEmptyState onExplore={handleExplore} />)

      fireEvent.click(screen.getByText('Explore Albums'))
      expect(handleExplore).toHaveBeenCalledTimes(1)
    })
  })

  describe('NoNotificationsEmptyState', () => {
    it('should render "All Caught Up!"', () => {
      render(<NoNotificationsEmptyState />)

      expect(screen.getByText('All Caught Up!')).toBeInTheDocument()
      // Note: NoNotificationsEmptyState uses minimal variant which only renders the title
    })
  })

  describe('EnhancedEmptyState', () => {
    it('should render with custom title and description', () => {
      render(
        <EnhancedEmptyState
          title="Custom Title"
          description="Custom description text"
        />
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('should render with custom icon', () => {
      render(
        <EnhancedEmptyState
          icon={<span data-testid="custom-icon">Icon</span>}
          title="With Icon"
        />
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('should render minimal variant without particles', () => {
      const { container } = render(
        <EnhancedEmptyState
          title="Minimal"
          variant="minimal"
          showParticles={false}
        />
      )

      expect(screen.getByText('Minimal')).toBeInTheDocument()
      // Minimal variant uses a simpler layout
      expect(container.querySelector('.py-8')).not.toBeNull()
    })

    it('should render card variant in card style', () => {
      const { container } = render(
        <EnhancedEmptyState
          title="Card Style"
          description="In a card"
          variant="card"
        />
      )

      expect(screen.getByText('Card Style')).toBeInTheDocument()
      // Card variant has rounded-2xl class
      expect(container.querySelector('.rounded-2xl')).not.toBeNull()
    })

    it('should render action button when action is provided', () => {
      const handleClick = jest.fn()
      render(
        <EnhancedEmptyState
          title="With Action"
          action={{ label: 'Do Something', onClick: handleClick }}
        />
      )

      fireEvent.click(screen.getByText('Do Something'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should render without description when not provided', () => {
      render(<EnhancedEmptyState title="Title Only" />)

      expect(screen.getByText('Title Only')).toBeInTheDocument()
    })
  })
})
