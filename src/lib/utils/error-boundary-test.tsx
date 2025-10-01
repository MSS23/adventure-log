'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

/**
 * Test component that intentionally throws errors for testing error boundaries
 * Only use in development environment
 */
export const ErrorBoundaryTest = ({
  children,
  shouldError = false
}: {
  children?: React.ReactNode
  shouldError?: boolean
}) => {
  const [triggerError, setTriggerError] = React.useState(shouldError)

  if (triggerError) {
    throw new Error('Test error thrown by ErrorBoundaryTest component')
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800 mb-2">
        Error Boundary Test Component (Development Only)
      </p>
      <Button
        onClick={() => setTriggerError(true)}
        variant="outline"
        size="sm"
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        Trigger Error
      </Button>
      {children}
    </div>
  )
}

/**
 * Hook to programmatically trigger errors for testing
 */
export const useErrorTesting = () => {
  const triggerError = React.useCallback((message: string = 'Test error from useErrorTesting') => {
    throw new Error(message)
  }, [])

  return { triggerError }
}