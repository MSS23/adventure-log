'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { log } from '@/lib/utils/logger'
import type { ThreeRenderer, GlobeInternals } from '../types'

export interface UseGlobeVisibilityReturn {
  isVisibleRef: React.MutableRefObject<boolean>
  isInViewportRef: React.MutableRefObject<boolean>
  rendererRef: React.MutableRefObject<ThreeRenderer | null>
  disposedRef: React.MutableRefObject<boolean>
  shouldRender: () => boolean
  windowDimensions: { width: number; height: number }
  globeContainerRef: React.MutableRefObject<HTMLDivElement | null>
}

export function useGlobeVisibility(
  globeRef: React.MutableRefObject<GlobeMethods | undefined>,
  isAutoRotating: boolean,
  setIsAutoRotating: (value: boolean) => void,
  globeReady: boolean,
  setGlobeReady: (value: boolean) => void,
  hideHeader: boolean
): UseGlobeVisibilityReturn {
  const isVisibleRef = useRef(true)
  const isInViewportRef = useRef(true)
  const rendererRef = useRef<ThreeRenderer | null>(null)
  const disposedRef = useRef(false)
  const globeContainerRef = useRef<HTMLDivElement | null>(null)

  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 100 : 800
  }))

  // Helper function to check if rendering should be active
  const shouldRender = useCallback(() => {
    return isVisibleRef.current && isInViewportRef.current
  }, [])

  // Page Visibility API - Pause rendering when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      isVisibleRef.current = isVisible

      log.info('Page visibility changed', {
        component: 'EnhancedGlobe',
        action: 'visibility-change',
        isVisible
      })

      // NOTE: rendering pause/resume is driven by the `shouldRender()` guard
      // inside the render loop (installed in onGlobeReady), which reads
      // `isVisibleRef`. We must NOT call `setAnimationLoop(null)` here — doing
      // so permanently kills the loop with nothing to restart it, freezing the
      // globe. Toggling the ref is enough; the loop skips frames on its own.
      if (!isVisible) {
        if (isAutoRotating) {
          setIsAutoRotating(false)
        }
        log.info('Paused WebGL rendering (tab hidden)', { component: 'EnhancedGlobe' })
      } else if (shouldRender()) {
        log.info('Resumed WebGL rendering (tab visible)', { component: 'EnhancedGlobe' })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAutoRotating, setIsAutoRotating, shouldRender, globeRef])

  // Intersection Observer - Pause rendering when globe is out of viewport
  useEffect(() => {
    if (!globeContainerRef.current) return

    const observerOptions = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const isInViewport = entry.isIntersecting
        isInViewportRef.current = isInViewport

        log.info('Globe viewport visibility changed', {
          component: 'EnhancedGlobe',
          action: 'viewport-change',
          isInViewport,
          intersectionRatio: entry.intersectionRatio
        })

        // As with the tab-visibility handler: the render loop's `shouldRender()`
        // guard (reading `isInViewportRef`) pauses/resumes frames on its own.
        // Never call `setAnimationLoop(null)` — it kills the loop permanently
        // and freezes the globe.
        if (!isInViewport) {
          if (isAutoRotating) {
            setIsAutoRotating(false)
          }
          log.info('Paused WebGL rendering (out of viewport)', { component: 'EnhancedGlobe' })
        } else if (shouldRender()) {
          log.info('Resumed WebGL rendering (in viewport)', { component: 'EnhancedGlobe' })
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersection, observerOptions)
    observer.observe(globeContainerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isAutoRotating, setIsAutoRotating, shouldRender])

  // Handle container resize for responsive globe using ResizeObserver
  useEffect(() => {
    const updateDimensions = () => {
      const container = globeContainerRef.current

      let width: number
      let height: number

      if (container) {
        const containerRect = container.getBoundingClientRect()
        width = containerRect.width
        height = containerRect.height

        log.info('Globe container dimensions', {
          component: 'EnhancedGlobe',
          action: 'update-dimensions',
          width,
          height,
          hideHeader,
          containerElement: !!container
        })

        // Special handling for flex-1 containers that may not have computed height yet
        if (hideHeader && height === 0) {
          log.info('Flex container has zero height, starting retry sequence', {
            component: 'EnhancedGlobe',
            action: 'update-dimensions',
            hideHeader
          })

          const maxRetries = 3
          const retryDelays = [0, 50, 100]
          let retryCount = 0

          const attemptMeasure = () => {
            const retryRect = container.getBoundingClientRect()
            if (retryRect.height > 0) {
              log.info('Flex container height computed on retry', {
                component: 'EnhancedGlobe',
                action: 'update-dimensions',
                width: retryRect.width,
                height: retryRect.height,
                retryAttempt: retryCount
              })
              setWindowDimensions({ width: retryRect.width, height: retryRect.height })
            } else if (retryCount < maxRetries) {
              retryCount++
              log.info('Retrying dimension measurement', {
                component: 'EnhancedGlobe',
                action: 'update-dimensions',
                retryAttempt: retryCount,
                delayMs: retryDelays[retryCount]
              })
              setTimeout(() => requestAnimationFrame(attemptMeasure), retryDelays[retryCount])
            } else {
              const parentRect = container.parentElement?.getBoundingClientRect()
              if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
                log.info('Using parent dimensions after failed retries', {
                  component: 'EnhancedGlobe',
                  action: 'update-dimensions',
                  parentWidth: parentRect.width,
                  parentHeight: parentRect.height
                })
                setWindowDimensions({ width: parentRect.width, height: parentRect.height })
              } else {
                const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
                const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 800
                log.info('Using window dimensions as fallback after all retries failed', {
                  component: 'EnhancedGlobe',
                  action: 'update-dimensions',
                  fallbackWidth,
                  fallbackHeight
                })
                setWindowDimensions({ width: fallbackWidth, height: fallbackHeight })
              }
            }
          }

          requestAnimationFrame(attemptMeasure)
          return
        }

        // Ensure we have valid dimensions
        if (width === 0 || height === 0) {
          const parentRect = container.parentElement?.getBoundingClientRect()
          if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
            width = parentRect.width
            height = parentRect.height
            log.info('Using parent element dimensions as fallback', {
              component: 'EnhancedGlobe',
              action: 'update-dimensions',
              parentWidth: width,
              parentHeight: height,
              hideHeader
            })
          } else {
            width = typeof window !== 'undefined' ? window.innerWidth : 1200
            height = typeof window !== 'undefined' ? window.innerHeight - 100 : 800

            log.info('Globe container has zero dimensions, using window fallback', {
              component: 'EnhancedGlobe',
              action: 'update-dimensions',
              fallbackWidth: width,
              fallbackHeight: height,
              hideHeader
            })
          }
        }
      } else {
        width = typeof window !== 'undefined' ? window.innerWidth : 1200
        height = typeof window !== 'undefined' ? window.innerHeight - 100 : 800

        // Benign: the ref is briefly null on the first frame / fast nav. The
        // window fallback is a perfectly valid size, so log at info (not warn)
        // to avoid flooding Sentry with a non-issue.
        log.info('Globe container ref not available, using window fallback', {
          component: 'EnhancedGlobe',
          action: 'update-dimensions',
          fallbackWidth: width,
          fallbackHeight: height,
          hideHeader
        })
      }

      // Only update if dimensions changed significantly (>10px to avoid jitter)
      setWindowDimensions(prev => {
        if (Math.abs(prev.width - width) > 10 || Math.abs(prev.height - height) > 10) {
          log.info('Updating globe dimensions', {
            component: 'EnhancedGlobe',
            action: 'update-dimensions',
            oldWidth: prev.width,
            oldHeight: prev.height,
            newWidth: width,
            newHeight: height,
            hideHeader
          })
          return { width, height }
        }
        return prev
      })
    }

    requestAnimationFrame(() => {
      updateDimensions()
    })

    const container = globeContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateDimensions()
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [hideHeader])

  // Cleanup on unmount - Comprehensive cleanup of all resources
  useEffect(() => {
    return () => {
      // WHY: read the ref at cleanup time — at mount, react-globe.gl hasn't
      // assigned globeRef.current yet, so capturing it in the effect body
      // always yields undefined and the disposal block below never runs.
      const globe = globeRef.current

      if (disposedRef.current) {
        log.info('Cleanup already performed, skipping', { component: 'EnhancedGlobe' })
        return
      }
      disposedRef.current = true

      log.info('Cleaning up globe component', {
        component: 'EnhancedGlobe',
        action: 'cleanup-unmount'
      })

      // Stop WebGL rendering
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        rendererRef.current = null
      }

      // Dispose Three.js resources
      if (globe) {
        const globeMethods = globe as unknown as GlobeInternals
        const scene = globeMethods.scene?.()
        const renderer = globeMethods.renderer?.()

        if (scene && typeof scene === 'object' && 'traverse' in scene) {
          interface ThreeObject {
            geometry?: { dispose: () => void }
            material?: { dispose: () => void } | Array<{ dispose: () => void }>
          }

          (scene as { traverse: (callback: (obj: ThreeObject) => void) => void }).traverse((object: ThreeObject) => {
            if (object.geometry) {
              object.geometry.dispose()
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose())
              } else {
                object.material.dispose()
              }
            }
          })
        }

        if (renderer && typeof renderer === 'object') {
          interface WebGLRenderer extends ThreeRenderer {
            dispose: () => void
            forceContextLoss?: () => void
            domElement?: HTMLCanvasElement
          }

          const webglRenderer = renderer as unknown as WebGLRenderer

          if (webglRenderer.forceContextLoss) {
            try {
              webglRenderer.forceContextLoss()
              log.info('Forced WebGL context loss', { component: 'EnhancedGlobe' })
            } catch (error) {
              log.error('Error forcing context loss', { component: 'EnhancedGlobe' }, error as Error)
            }
          }

          if ('dispose' in webglRenderer) {
            try {
              webglRenderer.dispose()
              log.info('WebGL renderer disposed', { component: 'EnhancedGlobe' })
            } catch (error) {
              log.error('Error disposing renderer', { component: 'EnhancedGlobe' }, error as Error)
            }
          }

          if (webglRenderer.domElement && webglRenderer.domElement.parentNode) {
            webglRenderer.domElement.parentNode.removeChild(webglRenderer.domElement)
            log.info('Canvas removed from DOM', { component: 'EnhancedGlobe' })
          }
        }
      }

      // Clear globe ref
      globeRef.current = undefined
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // WebGL context lost/restored event handlers
  useEffect(() => {
    if (!globeContainerRef.current) return

    const canvas = globeContainerRef.current.querySelector('canvas')
    if (!canvas) return

    const handleContextLost = (event: Event) => {
      // preventDefault() lets the browser restore the context (handled below).
      // This is an expected, recoverable event on memory-constrained mobile
      // GPUs — log at info so it doesn't flood Sentry as an error.
      event.preventDefault()
      log.info('WebGL context lost — awaiting automatic restore', {
        component: 'EnhancedGlobe',
        action: 'webgl-context-lost'
      })
    }

    const handleContextRestored = () => {
      log.info('WebGL context restored', {
        component: 'EnhancedGlobe',
        action: 'webgl-context-restored'
      })

      disposedRef.current = false
      setGlobeReady(false)
      setTimeout(() => setGlobeReady(true), 100)
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [globeReady, setGlobeReady])

  return {
    isVisibleRef,
    isInViewportRef,
    rendererRef,
    disposedRef,
    shouldRender,
    windowDimensions,
    globeContainerRef
  }
}
