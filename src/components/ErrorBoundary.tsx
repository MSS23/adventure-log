'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  compact?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('ErrorBoundary caught an error', {
      component: 'ErrorBoundary',
      action: 'catch-error',
      errorInfo: errorInfo.componentStack,
    }, error)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      if (this.props.compact) {
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-olive-950 dark:text-olive-50 mb-1">
              Something went wrong
            </p>
            <p className="text-xs text-olive-600 dark:text-olive-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl h-8 px-3 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="rounded-xl h-8 px-3 text-xs border-olive-200 dark:border-white/[0.1]"
              >
                Refresh
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3 text-left w-full">
                <summary className="cursor-pointer text-xs font-medium text-olive-700 dark:text-olive-300">
                  Error Details
                </summary>
                <pre className="mt-1 text-[10px] bg-olive-100 dark:bg-white/5 p-2 rounded-lg overflow-auto max-h-32 text-olive-800 dark:text-olive-200">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        )
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
          <div className="max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-olive-600 dark:text-olive-400 mb-6">
              We encountered an unexpected error. Please try again.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl h-10 px-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="rounded-xl h-10 px-4 border-olive-200 dark:border-white/[0.1]"
              >
                Refresh Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-olive-700 dark:text-olive-300">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-olive-100 dark:bg-white/5 p-3 rounded-lg overflow-auto max-h-48 text-olive-800 dark:text-olive-200">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
