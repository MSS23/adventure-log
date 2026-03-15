'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'slideLeft' | 'slideRight'
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(false)
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${className || ''}`}
    >
      {children}
    </div>
  )
}

/**
 * Smart page transition that determines direction based on navigation
 */
export function SmartPageTransition({ children, className }: Omit<PageTransitionProps, 'variant'>) {
  return <PageTransition className={className}>{children}</PageTransition>
}

// Simple fade transition for sections within pages
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {children}
    </div>
  )
}

// Slide up animation for modals and overlays
export function SlideUpTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-slide-up ${className || ''}`}>
      {children}
    </div>
  )
}
