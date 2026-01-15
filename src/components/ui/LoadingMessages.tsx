'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Globe, MapPin, Compass, Camera, Mountain, Palmtree, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// Travel-themed loading messages
const loadingMessages = [
  { text: 'Packing your adventures...', icon: Plane },
  { text: 'Exploring the globe...', icon: Globe },
  { text: 'Mapping your journeys...', icon: MapPin },
  { text: 'Finding hidden gems...', icon: Compass },
  { text: 'Capturing memories...', icon: Camera },
  { text: 'Scaling new heights...', icon: Mountain },
  { text: 'Discovering paradise...', icon: Palmtree },
  { text: 'Setting sail...', icon: Ship },
]

// Context-specific messages
const contextMessages = {
  feed: [
    'Loading adventures from friends...',
    'Gathering travel stories...',
    'Fetching the latest journeys...',
  ],
  albums: [
    'Opening your photo albums...',
    'Organizing your memories...',
    'Loading your adventures...',
  ],
  globe: [
    'Spinning up the globe...',
    'Plotting your destinations...',
    'Connecting your journeys...',
  ],
  profile: [
    'Loading your travel profile...',
    'Counting your adventures...',
    'Calculating travel stats...',
  ],
  upload: [
    'Uploading your photos...',
    'Preserving your memories...',
    'Saving your adventure...',
  ],
  search: [
    'Searching destinations...',
    'Finding adventures...',
    'Exploring the world...',
  ],
}

interface LoadingMessageProps {
  context?: keyof typeof contextMessages
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function LoadingMessage({
  context,
  className,
  showIcon = true,
  size = 'md',
  animate = true,
}: LoadingMessageProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const messages = context ? contextMessages[context] : loadingMessages.map((m) => m.text)
  const icons = loadingMessages.map((m) => m.icon)

  useEffect(() => {
    if (!animate) return

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [messages.length, animate])

  const currentMessage = messages[messageIndex]
  const CurrentIcon = icons[messageIndex % icons.length]

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  if (prefersReducedMotion || !animate) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-600', sizeClasses[size], className)}>
        {showIcon && <CurrentIcon className={cn(iconSizes[size], 'text-teal-500')} />}
        <span>{currentMessage}</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size], className)}>
      {showIcon && (
        <motion.div
          key={messageIndex}
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <CurrentIcon className={cn(iconSizes[size], 'text-teal-500')} />
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={currentMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-gray-600"
        >
          {currentMessage}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

// Animated plane loader
export function PlaneLoader({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <Plane className={cn('h-8 w-8 text-teal-500', className)} />
  }

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        x: [0, 10, 0, -10, 0],
        y: [0, -5, 0, -5, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Plane className="h-8 w-8 text-teal-500 rotate-[-15deg]" />
      <motion.div
        className="absolute -bottom-1 left-1/2 h-1 w-4 rounded-full bg-teal-200/50 blur-sm"
        style={{ marginLeft: '-8px' }}
        animate={{ scaleX: [1, 1.5, 1], opacity: [0.5, 0.3, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  )
}

// Globe spinner
export function GlobeSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const prefersReducedMotion = useReducedMotion()

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }

  if (prefersReducedMotion) {
    return <Globe className={cn(sizeClasses[size], 'text-teal-500', className)} />
  }

  return (
    <motion.div
      animate={{ rotateY: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      style={{ transformStyle: 'preserve-3d' }}
      className={className}
    >
      <Globe className={cn(sizeClasses[size], 'text-teal-500')} />
    </motion.div>
  )
}

// Compass spinner
export function CompassSpinner({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <Compass className={cn('h-8 w-8 text-teal-500', className)} />
  }

  return (
    <motion.div
      animate={{ rotate: [0, 20, -20, 10, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      <Compass className="h-8 w-8 text-teal-500" />
    </motion.div>
  )
}

// Full-screen loading overlay with travel theme
export function TravelLoadingOverlay({
  isLoading,
  message,
  context,
}: {
  isLoading: boolean
  message?: string
  context?: keyof typeof contextMessages
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center gap-6">
            {!prefersReducedMotion ? (
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="relative">
                  <Globe className="h-16 w-16 text-teal-500" />
                  <motion.div
                    className="absolute -right-2 -top-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  >
                    <Plane className="h-6 w-6 text-teal-400" />
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <Globe className="h-16 w-16 text-teal-500" />
            )}

            {message ? (
              <p className="text-lg text-gray-600">{message}</p>
            ) : (
              <LoadingMessage context={context} size="lg" />
            )}

            {!prefersReducedMotion && (
              <motion.div
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-teal-400"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
