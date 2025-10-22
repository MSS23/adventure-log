'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSmartNavigation } from '@/lib/hooks/useSmartNavigation'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  fallbackRoute?: string
  label?: string
  className?: string
  variant?: 'default' | 'ghost' | 'outline' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function BackButton({
  fallbackRoute = '/feed',
  label = 'Back',
  className,
  variant = 'ghost',
  size = 'sm',
  showLabel = true
}: BackButtonProps) {
  const { goBack } = useSmartNavigation(fallbackRoute)

  return (
    <Button
      variant={variant}
      size={size}
      onClick={goBack}
      className={cn(
        'gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
    </Button>
  )
}

/**
 * Simplified text-only back button for minimal UI
 */
export function BackLink({
  fallbackRoute = '/feed',
  label = 'Back',
  className
}: Omit<BackButtonProps, 'variant' | 'size' | 'showLabel'>) {
  const { goBack } = useSmartNavigation(fallbackRoute)

  return (
    <button
      onClick={goBack}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors cursor-pointer',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}
