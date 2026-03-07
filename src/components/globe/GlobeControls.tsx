'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Globe,
  Map,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export type ZoomLevel = 'world' | 'continent' | 'country' | 'city'

interface ZoomPreset {
  id: ZoomLevel
  label: string
  altitude: number
  icon: typeof Globe
  shortcut: string
}

const zoomPresets: ZoomPreset[] = [
  { id: 'world', label: 'World', altitude: 2.5, icon: Globe, shortcut: '1' },
  { id: 'continent', label: 'Continent', altitude: 1.2, icon: Map, shortcut: '2' },
  { id: 'country', label: 'Country', altitude: 0.5, icon: Navigation, shortcut: '3' },
  { id: 'city', label: 'City', altitude: 0.15, icon: ZoomIn, shortcut: '4' },
]

interface GlobeControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToLevel: (altitude: number) => void
  onFitToJourneys: () => void
  onPlayJourney: () => void
  onPauseJourney: () => void
  onReset: () => void
  isPlaying?: boolean
  hasJourneys?: boolean
  currentZoom?: number
  className?: string
  variant?: 'full' | 'compact' | 'minimal'
}

export function GlobeControls({
  onZoomIn,
  onZoomOut,
  onZoomToLevel,
  onFitToJourneys,
  onPlayJourney,
  onPauseJourney,
  onReset,
  isPlaying = false,
  hasJourneys = true,
  currentZoom = 2.5,
  className,
  variant = 'full',
}: GlobeControlsProps) {
  const [showPresets, setShowPresets] = useState(false)
  const { triggerLight, triggerSelection } = useHaptics()
  const prefersReducedMotion = useReducedMotion()

  const handleZoomPreset = (preset: ZoomPreset) => {
    triggerSelection()
    onZoomToLevel(preset.altitude)
    setShowPresets(false)
  }

  const ControlButton = ({
    onClick,
    icon: Icon,
    label,
    active = false,
    disabled = false,
  }: {
    onClick: () => void
    icon: typeof ZoomIn
    label: string
    active?: boolean
    disabled?: boolean
  }) => (
    <motion.button
      onClick={() => {
        if (!disabled) {
          triggerLight()
          onClick()
        }
      }}
      disabled={disabled}
      className={cn(
        'p-2.5 rounded-xl transition-all',
        active
          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
          : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      whileTap={prefersReducedMotion || disabled ? {} : { scale: 0.9 }}
      whileHover={prefersReducedMotion || disabled ? {} : { scale: 1.05 }}
      title={label}
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </motion.button>
  )

  // Minimal version - just zoom in/out
  if (variant === 'minimal') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <ControlButton onClick={onZoomIn} icon={ZoomIn} label="Zoom in" />
        <ControlButton onClick={onZoomOut} icon={ZoomOut} label="Zoom out" />
      </div>
    )
  }

  // Compact version - zoom + fit
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-2 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg', className)}>
        <ControlButton onClick={onZoomIn} icon={ZoomIn} label="Zoom in" />
        <ControlButton onClick={onZoomOut} icon={ZoomOut} label="Zoom out" />
        <div className="h-px bg-gray-200 my-1" />
        <ControlButton onClick={onFitToJourneys} icon={Maximize2} label="Fit to journeys" disabled={!hasJourneys} />
        <ControlButton onClick={onReset} icon={RotateCcw} label="Reset view" />
      </div>
    )
  }

  // Full version with all controls
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Main controls */}
      <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 shadow-lg border border-gray-100">
        {/* Zoom controls */}
        <div className="flex flex-col gap-1">
          <ControlButton onClick={onZoomIn} icon={ZoomIn} label="Zoom in (+)" />
          <ControlButton onClick={onZoomOut} icon={ZoomOut} label="Zoom out (-)" />
        </div>

        <div className="h-px bg-gray-200" />

        {/* Zoom presets dropdown */}
        <div className="relative">
          <motion.button
            onClick={() => setShowPresets(!showPresets)}
            className={cn(
              'w-full p-2.5 rounded-xl transition-all flex items-center justify-between',
              'bg-gray-50 hover:bg-gray-100 text-gray-700'
            )}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            <span className="text-xs font-medium">Zoom Presets</span>
            <motion.div
              animate={{ rotate: showPresets ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showPresets && (
              <motion.div
                className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[140px]"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {zoomPresets.map((preset) => {
                  const Icon = preset.icon
                  const isActive = Math.abs(currentZoom - preset.altitude) < 0.1

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleZoomPreset(preset)}
                      className={cn(
                        'w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{preset.label}</span>
                      <span className="ml-auto text-xs text-gray-400 font-mono">
                        {preset.shortcut}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-px bg-gray-200" />

        {/* View controls */}
        <ControlButton
          onClick={onFitToJourneys}
          icon={Maximize2}
          label="Fit to my journeys"
          disabled={!hasJourneys}
        />
        <ControlButton onClick={onReset} icon={RotateCcw} label="Reset view" />
      </div>

      {/* Journey playback controls */}
      {hasJourneys && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 shadow-lg border border-gray-100">
          <motion.button
            onClick={() => {
              triggerSelection()
              isPlaying ? onPauseJourney() : onPlayJourney()
            }}
            className={cn(
              'w-full p-3 rounded-xl transition-all flex items-center justify-center gap-2',
              isPlaying
                ? 'bg-orange-500 text-white'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            )}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5" />
                <span className="text-sm font-medium">Pause Journey</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span className="text-sm font-medium">Play Journey</span>
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="text-center">
        <span className="text-xs text-gray-400">
          Press 1-4 for zoom presets
        </span>
      </div>
    </div>
  )
}

// Hook for keyboard shortcuts
export function useGlobeKeyboardControls({
  onZoomIn,
  onZoomOut,
  onZoomToLevel,
  onTogglePlay,
  onReset,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToLevel: (altitude: number) => void
  onTogglePlay: () => void
  onReset: () => void
}) {
  // This should be called in useEffect
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle if user is typing
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault()
        onZoomIn()
        break
      case '-':
      case '_':
        e.preventDefault()
        onZoomOut()
        break
      case '1':
        e.preventDefault()
        onZoomToLevel(2.5) // World
        break
      case '2':
        e.preventDefault()
        onZoomToLevel(1.2) // Continent
        break
      case '3':
        e.preventDefault()
        onZoomToLevel(0.5) // Country
        break
      case '4':
        e.preventDefault()
        onZoomToLevel(0.15) // City
        break
      case ' ':
        e.preventDefault()
        onTogglePlay()
        break
      case 'r':
      case 'R':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onReset()
        }
        break
    }
  }

  return handleKeyDown
}
