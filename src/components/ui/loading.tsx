/**
 * Standardized loading UI components for Adventure Log
 * Provides consistent loading indicators across the application
 */

import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/lib/hooks/useLoadingState'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

export interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
    </div>
  )
}

export interface LoadingBarProps {
  progress?: number
  className?: string
  showPercentage?: boolean
}

export function LoadingBar({ progress, className, showPercentage = false }: LoadingBarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Progress value={progress} className="h-2" />
      {showPercentage && progress !== undefined && (
        <div className="text-xs text-gray-600 text-center">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

export interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
  progress?: number
  stage?: string
  className?: string
  children?: React.ReactNode
}

export function LoadingOverlay({
  isLoading,
  text = 'Loading...',
  progress,
  stage,
  className,
  children
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      {children && (
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      )}

      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-blue-600" />

          <div className="space-y-3">
            <p className="text-gray-900 font-medium">{text}</p>

            {stage && (
              <Badge variant="outline" className="text-xs">
                {stage}
              </Badge>
            )}

            {progress !== undefined && (
              <LoadingBar progress={progress} showPercentage />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface FormLoadingProps {
  loadingState: LoadingState
  className?: string
}

export function FormLoading({ loadingState, className }: FormLoadingProps) {
  const { isLoading, loadingText, progress, stage } = loadingState

  if (!isLoading) return null

  return (
    <div className={cn('flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200', className)}>
      <LoadingSpinner size="sm" className="text-blue-600" />

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-900">{loadingText}</p>
          {stage && (
            <Badge variant="outline" size="sm" className="text-xs">
              {stage}
            </Badge>
          )}
        </div>

        {progress !== undefined && (
          <LoadingBar progress={progress} className="max-w-xs" />
        )}
      </div>
    </div>
  )
}

export interface ButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function ButtonLoading({
  isLoading,
  children,
  loadingText,
  className
}: ButtonLoadingProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {isLoading && <LoadingSpinner size="sm" />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </div>
  )
}

export interface InlineLoadingProps {
  isLoading: boolean
  text?: string
  size?: 'sm' | 'md'
  className?: string
}

export function InlineLoading({
  isLoading,
  text = 'Loading...',
  size = 'sm',
  className
}: InlineLoadingProps) {
  if (!isLoading) return null

  return (
    <div className={cn('flex items-center space-x-2 text-gray-600', className)}>
      <LoadingSpinner size={size} />
      <span className={cn('text-sm', size === 'md' && 'text-base')}>{text}</span>
    </div>
  )
}

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
  )
}

export interface CardSkeletonProps {
  lines?: number
  className?: string
}

export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      <Skeleton className="h-4 w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3',
            i === lines - 1 ? 'w-1/2' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export interface LoadingStateIndicatorProps {
  state: 'loading' | 'success' | 'error'
  text: string
  className?: string
}

export function LoadingStateIndicator({
  state,
  text,
  className
}: LoadingStateIndicatorProps) {
  const icons = {
    loading: <LoadingSpinner size="sm" />,
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    error: <AlertCircle className="h-4 w-4 text-red-600" />
  }

  const textColors = {
    loading: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600'
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {icons[state]}
      <span className={cn('text-sm font-medium', textColors[state])}>
        {text}
      </span>
    </div>
  )
}

// Preset loading configurations for common use cases
export const LoadingPresets = {
  FormSubmission: ({ loadingState }: { loadingState: LoadingState }) => (
    <FormLoading loadingState={loadingState} />
  ),

  FileUpload: ({ progress, text }: { progress?: number; text?: string }) => (
    <div className="space-y-3">
      <InlineLoading isLoading={true} text={text || 'Uploading files...'} />
      {progress !== undefined && <LoadingBar progress={progress} showPercentage />}
    </div>
  ),

  DataFetching: ({ text }: { text?: string }) => (
    <InlineLoading isLoading={true} text={text || 'Loading data...'} />
  ),

  ButtonAction: ({ isLoading, children, loadingText }: ButtonLoadingProps) => (
    <ButtonLoading isLoading={isLoading} loadingText={loadingText}>
      {children}
    </ButtonLoading>
  )
}