'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  level?: 'page' | 'section' | 'component'
  showDetails?: boolean
  showReportButton?: boolean
}

/**
 * Enhanced Error Boundary with better UX and error reporting
 * Provides different fallback UIs based on the error level
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId } = this.state

    // Log the error with detailed information
    log.error('Component error boundary triggered', {
      component: 'ErrorBoundary',
      action: 'component-error',
      errorId,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component'
    }, error)

    this.setState({
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo, errorId)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    // Clear the error state to re-render children
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })

    log.info('Error boundary retry attempted', {
      component: 'ErrorBoundary',
      action: 'retry',
      level: this.props.level
    })
  }

  handleReportError = () => {
    const { error, errorId } = this.state
    if (!error) return

    // Create error report data
    const reportData = {
      errorId,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      level: this.props.level
    }

    // In a real app, this would send to an error reporting service
    log.info('Error report generated', {
      component: 'ErrorBoundary',
      action: 'report-error',
      reportData
    })

    // For now, copy to clipboard or prepare for email
    const reportText = JSON.stringify(reportData, null, 2)

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText)
        .then(() => alert('Error report copied to clipboard'))
        .catch(() => this.fallbackCopyToClipboard(reportText))
    } else {
      this.fallbackCopyToClipboard(reportText)
    }
  }

  private fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('Error report copied to clipboard')
  }

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state
      const { fallback, level = 'component', showDetails = false, showReportButton = false } = this.props

      // Use custom fallback if provided
      if (fallback && error) {
        return fallback(error, errorId, this.handleRetry)
      }

      // Page-level error (full page replacement)
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="max-w-lg w-full shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">
                  Something went wrong
                </CardTitle>
                <CardDescription className="text-gray-600">
                  We encountered an unexpected error. Don&apos;t worry, we&apos;ve been notified and are working to fix it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {showDetails && error && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">Error ID: {errorId}</p>
                    <p className="text-sm text-gray-700 font-mono">{error.message}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={this.handleRetry}
                    className="flex-1 gap-2"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </div>

                {showReportButton && (
                  <Button
                    onClick={this.handleReportError}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-gray-600"
                  >
                    <Bug className="h-4 w-4" />
                    Report Issue
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )
      }

      // Section-level error (replaces a section of content)
      if (level === 'section') {
        return (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    Unable to load content
                  </h3>
                  <p className="text-red-700 text-sm mb-3">
                    This section encountered an error and couldn&apos;t display properly.
                  </p>

                  {showDetails && error && (
                    <div className="mb-3 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                      {error.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={this.handleRetry}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>

                    {showReportButton && (
                      <Button
                        onClick={this.handleReportError}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Report
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

      // Component-level error (minimal inline error)
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">Component Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            This component failed to render properly.
          </p>
          <Button
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
            className="mt-2 h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    log.error('Manual error capture', {
      component: 'useErrorBoundary',
      action: 'capture-error',
      errorMessage: error.message
    }, error)
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError
  }
}

/**
 * Simple error fallback components for common cases
 */
export const ErrorFallbacks = {
  Simple: ({ retry }: { retry: () => void }) => (
    <div className="text-center py-8">
      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
      <p className="text-gray-600 mb-4">Something went wrong</p>
      <Button onClick={retry} size="sm">
        Try Again
      </Button>
    </div>
  ),

  Inline: ({ retry }: { retry: () => void }) => (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-800">Failed to load</span>
        <Button onClick={retry} size="sm" variant="outline" className="h-6 px-2 text-xs">
          Retry
        </Button>
      </div>
    </div>
  ),

  Card: ({ retry }: { retry: () => void }) => (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-800 font-medium mb-1">Unable to load content</p>
        <p className="text-red-600 text-sm mb-4">
          An error occurred while loading this section
        </p>
        <Button onClick={retry} size="sm" variant="outline">
          <RefreshCw className="h-3 w-3 mr-1" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

export default ErrorBoundary