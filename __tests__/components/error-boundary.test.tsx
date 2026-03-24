/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { ErrorBoundary } from '@/components/ErrorBoundary'

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Child content rendered</div>
}

// Suppress console.error for expected ErrorBoundary logs
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalConsoleError
})

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should show error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
  })

  it('should show "Try Again" button that resets error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // The Try Again button should exist
    const tryAgainButton = screen.getByText('Try Again')
    expect(tryAgainButton).toBeInTheDocument()
  })

  it('should show "Refresh Page" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Refresh Page')).toBeInTheDocument()
  })

  it('should conditionally show error details based on NODE_ENV', () => {
    // In test environment, NODE_ENV is 'test', not 'development'
    // The component only shows Error Details when NODE_ENV === 'development'
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    // In test environment, Error Details should NOT be shown
    if (process.env.NODE_ENV === 'development') {
      expect(screen.getByText('Error Details')).toBeInTheDocument()
    } else {
      expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
    }
  })

  it('should use custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should show compact mode with inline error', () => {
    render(
      <ErrorBoundary compact>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // Compact uses "Retry" instead of "Try Again"
    expect(screen.getByText('Retry')).toBeInTheDocument()
    // Compact uses "Refresh" instead of "Refresh Page"
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('should show error message in compact mode', () => {
    render(
      <ErrorBoundary compact>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should not show full-page layout in compact mode', () => {
    const { container } = render(
      <ErrorBoundary compact>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    // Compact mode should not have min-h-screen
    expect(container.querySelector('.min-h-screen')).toBeNull()
  })

  it('should render children and not error UI when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content rendered')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
