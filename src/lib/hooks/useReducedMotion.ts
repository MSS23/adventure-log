'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect user's motion preference
 *
 * Returns true if the user prefers reduced motion (has enabled
 * "Reduce motion" in their OS accessibility settings)
 *
 * @example
 * const prefersReducedMotion = useReducedMotion()
 *
 * // Use in animations
 * const variants = prefersReducedMotion
 *   ? { initial: {}, animate: {} }
 *   : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') return

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Returns animation variants that respect reduced motion preference
 *
 * @param normalVariants - Animation variants for users without reduced motion preference
 * @param reducedVariants - Optional simplified variants for reduced motion (defaults to no animation)
 */
export function useMotionVariants<T extends Record<string, unknown>>(
  normalVariants: T,
  reducedVariants?: Partial<T>
): T {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    // Return reduced variants or empty variants
    return reducedVariants as T ?? Object.keys(normalVariants).reduce((acc, key) => {
      acc[key as keyof T] = {} as T[keyof T]
      return acc
    }, {} as T)
  }

  return normalVariants
}

/**
 * Returns animation transition config that respects reduced motion preference
 */
export function useMotionTransition(normalTransition: object) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return { duration: 0 }
  }

  return normalTransition
}
