/**
 * Advanced Intersection Observer Hook
 * Provides lazy loading capabilities with optimized performance
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  triggerOnce?: boolean
  skip?: boolean
  delay?: number
}

interface UseIntersectionObserverReturn<T extends HTMLElement = HTMLElement> {
  ref: React.RefObject<T | null>
  isIntersecting: boolean
  hasIntersected: boolean
  entry: IntersectionObserverEntry | null
}

/**
 * Hook for detecting when an element enters/exits the viewport
 * Optimized for performance with lazy loading capabilities
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  skip = false,
  delay = 0
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn<T> {
  const ref = useRef<T>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    setEntry(entry)

    if (entry.isIntersecting) {
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsIntersecting(true)
          setHasIntersected(true)
        }, delay)
      } else {
        setIsIntersecting(true)
        setHasIntersected(true)
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (!triggerOnce) {
        setIsIntersecting(false)
      }
    }
  }, [delay, triggerOnce])

  useEffect(() => {
    if (skip) return

    const element = ref.current
    if (!element) return

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for unsupported browsers
      setIsIntersecting(true)
      setHasIntersected(true)
      return
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin
    })

    observer.observe(element)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      observer.disconnect()
    }
  }, [handleIntersection, threshold, rootMargin, skip])

  // Stop observing after first intersection if triggerOnce is true
  useEffect(() => {
    if (triggerOnce && hasIntersected && ref.current) {
      const element = ref.current
      // Create a new observer just to disconnect the element
      const observer = new IntersectionObserver(() => {})
      observer.unobserve(element)
    }
  }, [triggerOnce, hasIntersected])

  return {
    ref,
    isIntersecting,
    hasIntersected,
    entry
  }
}

/**
 * Hook for lazy loading images with intersection observer
 */
export function useLazyImage<T extends HTMLElement = HTMLElement>(src: string, options: UseIntersectionObserverOptions = {}) {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver<T>({
    triggerOnce: true,
    ...options
  })

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!hasIntersected) return

    const img = new Image()
    img.onload = () => setImageLoaded(true)
    img.onerror = () => setImageError(true)
    img.src = src
  }, [hasIntersected, src])

  return {
    ref,
    isIntersecting,
    hasIntersected,
    imageLoaded,
    imageError,
    shouldLoad: hasIntersected
  }
}

/**
 * Hook for lazy loading components with intersection observer
 */
export function useLazyComponent<T extends HTMLElement = HTMLElement>(options: UseIntersectionObserverOptions = {}) {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver<T>({
    triggerOnce: true,
    rootMargin: '100px', // Load components slightly before they're visible
    ...options
  })

  return {
    ref,
    shouldRender: hasIntersected,
    isVisible: isIntersecting
  }
}