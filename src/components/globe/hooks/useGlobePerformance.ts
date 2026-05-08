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

  // Performance settings based on mode
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
          maxPins: 1000,
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
          maxPins: 500,
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
          showArcs: false,
          pinSize: 0.8,
          maxPins: 200,
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
          maxPins: 500,
          arcCurveResolution: 64,
          arcCircularResolution: 32,
          solidArcs: false
        }
    }
  }, [effectivePerformanceMode])

  // Pick earth texture based on screen size and performance mode
  const globeImageUrl = useMemo(() => {
    if (effectivePerformanceMode === 'low') return '/earth-texture.jpg'
    if (typeof window !== 'undefined' && window.innerWidth < 768) return '/earth-texture.jpg'
    return '/earth-texture-4k.jpg'
  }, [effectivePerformanceMode])

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
