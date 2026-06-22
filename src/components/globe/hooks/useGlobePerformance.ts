'use client'

import { useState, useEffect, useMemo } from 'react'
import { log } from '@/lib/utils/logger'
import type { PerformanceConfig, PerformanceMode, EffectivePerformanceMode } from '../types'

export interface UseGlobePerformanceReturn {
  performanceMode: PerformanceMode
  setPerformanceMode: (mode: PerformanceMode) => void
  effectivePerformanceMode: EffectivePerformanceMode
  performanceConfig: PerformanceConfig
  globeImageUrl: string
  rendererConfig: { antialias: boolean; powerPreference: 'high-performance' | 'low-power' }
}

export function useGlobePerformance(): UseGlobePerformanceReturn {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('auto')
  const [hardwareAcceleration, setHardwareAcceleration] = useState<boolean | null>(null)

  // Detect hardware acceleration
  useEffect(() => {
    const detectHardwareAcceleration = () => {
      let canvas: HTMLCanvasElement | null = null
      let gl: WebGLRenderingContext | null = null

      try {
        canvas = document.createElement('canvas')
        gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null

        if (!gl) {
          setHardwareAcceleration(false)
          setPerformanceMode('low')
          log.warn('WebGL not available, using low performance mode')
          return
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          const isSoftware = /SwiftShader|llvmpipe|Microsoft Basic Render Driver/i.test(renderer)
          setHardwareAcceleration(!isSoftware)

          if (isSoftware) {
            setPerformanceMode('low')
            log.warn('Software rendering detected, using low performance mode', { renderer })
          } else {
            log.info('Hardware acceleration detected', { renderer })
          }
        } else {
          setHardwareAcceleration(true)
        }
      } catch (error) {
        log.error('Failed to detect hardware acceleration', { error })
        setHardwareAcceleration(true)
      } finally {
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context')
          if (loseContext) {
            loseContext.loseContext()
          }
        }
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
          canvas = null
        }
        gl = null
      }
    }

    detectHardwareAcceleration()
  }, [])

  // Calculate effective performance mode
  const effectivePerformanceMode = useMemo((): EffectivePerformanceMode => {
    if (performanceMode !== 'auto') return performanceMode
    return hardwareAcceleration === false ? 'low' : 'balanced'
  }, [performanceMode, hardwareAcceleration])

  // Performance settings based on mode.
  //
  // COMPLETENESS IS NON-NEGOTIABLE: every mode shows ALL pins and ALL
  // connections (uniform high `maxPins` + `showArcs: true`). Performance mode
  // only tunes *visual cost* — atmosphere, arc stroke, and curve resolution —
  // never how much of the user's travel data is rendered. Slower load on a
  // weak device is acceptable; a globe missing pins/arcs is not.
  const performanceConfig = useMemo((): PerformanceConfig => {
    switch (effectivePerformanceMode) {
      case 'high':
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.8,
          atmosphereAltitude: 0.25,
          arcStroke: 1.8,
          showArcs: true,
          pinSize: 1.2,
          maxPins: 12000,
          arcCurveResolution: 128,
          arcCircularResolution: 64,
          solidArcs: false
        }
      case 'balanced':
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.6,
          atmosphereAltitude: 0.15,
          arcStroke: 1.5,
          showArcs: true,
          pinSize: 1.0,
          maxPins: 12000,
          arcCurveResolution: 64,
          arcCircularResolution: 32,
          solidArcs: false
        }
      case 'low':
        return {
          showAtmosphere: false,
          atmosphereOpacity: 0,
          atmosphereAltitude: 0,
          arcStroke: 1.0,
          showArcs: true,
          pinSize: 0.8,
          maxPins: 12000,
          arcCurveResolution: 32,
          arcCircularResolution: 16,
          solidArcs: false
        }
      default:
        return {
          showAtmosphere: true,
          atmosphereOpacity: 0.6,
          atmosphereAltitude: 0.15,
          arcStroke: 1.5,
          showArcs: true,
          pinSize: 1.0,
          maxPins: 12000,
          arcCurveResolution: 64,
          arcCircularResolution: 32,
          solidArcs: false
        }
    }
  }, [effectivePerformanceMode])

  // The device-appropriate FINAL earth texture. High-DPR phones get the crisp
  // 4K map; genuinely low-density/low-RAM/low-perf devices get the light one.
  const targetImageUrl = useMemo(() => {
    if (effectivePerformanceMode === 'low') return '/earth-texture.jpg'
    if (typeof window === 'undefined') return '/earth-texture-4k.jpg'

    const dpr = window.devicePixelRatio || 1
    // navigator.deviceMemory (GB, Chrome/Android only). Low-RAM phones evict the
    // WebGL context under memory pressure when holding the 4K texture — those
    // get the lighter texture to avoid "context lost". Unknown → assume capable.
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const isMemoryConstrained = typeof deviceMemory === 'number' && deviceMemory < 4
    if (isMemoryConstrained) return '/earth-texture.jpg'

    const isSmallLowDensity = window.innerWidth < 768 && dpr < 2
    return isSmallLowDensity ? '/earth-texture.jpg' : '/earth-texture-4k.jpg'
  }, [effectivePerformanceMode])

  // PROGRESSIVE LOAD: paint the lightweight 239KB texture immediately, then
  // upgrade to the target (4K ≈ 1.4MB) once it has preloaded in the background.
  // This is the main fix for slow globe load on mobile — time-to-first-globe is
  // driven by the light texture, and the crisp texture swaps in seamlessly when
  // ready (react-globe.gl just re-uploads the map, no scene re-init).
  const LIGHT_TEXTURE = '/earth-texture.jpg'
  const [hiResReady, setHiResReady] = useState(false)
  useEffect(() => {
    if (targetImageUrl === LIGHT_TEXTURE) {
      setHiResReady(true)
      return
    }
    setHiResReady(false)
    let cancelled = false
    const img = new window.Image()
    img.onload = () => { if (!cancelled) setHiResReady(true) }
    img.src = targetImageUrl
    return () => { cancelled = true }
  }, [targetImageUrl])

  const globeImageUrl = hiResReady ? targetImageUrl : LIGHT_TEXTURE

  // Memoize renderer config
  const rendererConfig = useMemo(() => ({
    antialias: effectivePerformanceMode !== 'low',
    powerPreference: (effectivePerformanceMode === 'high' ? 'high-performance' : 'low-power') as 'high-performance' | 'low-power'
  }), [effectivePerformanceMode])

  return {
    performanceMode,
    setPerformanceMode,
    effectivePerformanceMode,
    performanceConfig,
    globeImageUrl,
    rendererConfig
  }
}
