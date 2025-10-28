'use client'

import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeartAnimationProps {
  show: boolean
  onComplete?: () => void
  className?: string
}

export function HeartAnimation({ show, onComplete, className }: HeartAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 1000) // Animation duration

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className={cn(
      "absolute inset-0 flex items-center justify-center pointer-events-none z-50",
      className
    )}>
      <div className="animate-heart-pulse">
        <Heart className="h-20 w-20 text-white fill-white drop-shadow-2xl" />
      </div>
    </div>
  )
}