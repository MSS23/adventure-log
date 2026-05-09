'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useOnlineStatus } from '@/lib/hooks/usePWA'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NetworkStatusIndicatorProps {
  className?: string
  showLabel?: boolean
}

export function NetworkStatusIndicator({ className, showLabel = false }: NetworkStatusIndicatorProps) {
  // Skip server render — navigator.onLine and prefers-reduced-motion both
  // depend on browser-only APIs, and rendering them server-side guesses
  // wrong roughly half the time, producing a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { isOnline, connectionType, isSlowConnection } = useOnlineStatus()
  const prefersReducedMotion = useReducedMotion()

  if (!mounted) return null

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: 'bg-red-500',
        pulseColor: 'bg-red-400',
        label: 'Offline',
        description: 'No internet connection'
      }
    }
    if (isSlowConnection) {
      return {
        color: 'bg-olive-500',
        pulseColor: 'bg-olive-400',
        label: 'Slow',
        description: `Slow connection (${connectionType})`
      }
    }
    return {
      color: 'bg-green-500',
      pulseColor: 'bg-green-400',
      label: 'Online',
      description: connectionType !== 'unknown' ? `Connected (${connectionType})` : 'Connected'
    }
  }

  const config = getStatusConfig()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2 cursor-default", className)}>
            <div className="relative">
              {/* Pulsing ring for offline state */}
              {!isOnline && !prefersReducedMotion && (
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-full",
                    config.pulseColor
                  )}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}

              {/* Status dot */}
              <motion.div
                className={cn(
                  "w-2 h-2 rounded-full relative z-10",
                  config.color
                )}
                initial={false}
                animate={
                  !isOnline && !prefersReducedMotion
                    ? { scale: [1, 0.9, 1] }
                    : { scale: 1 }
                }
                transition={
                  !isOnline
                    ? { duration: 1.5, repeat: Infinity }
                    : { duration: 0.2 }
                }
              />
            </div>

            {showLabel && (
              <span className={cn(
                "text-xs font-medium",
                isOnline ? "text-stone-600" : "text-red-600"
              )}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          <div className="text-center">
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-stone-500">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
