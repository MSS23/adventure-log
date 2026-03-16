'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

export interface TourStep {
  /** CSS selector or data-tour-step value to highlight */
  target: string
  /** Title shown in tooltip */
  title: string
  /** Description text */
  description: string
  /** Icon component (optional) */
  icon?: ReactNode
  /** Which side the tooltip appears on ('top' | 'bottom' | 'left' | 'right' | 'auto') */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  /** Callback to trigger before showing this step (e.g. open a menu) */
  beforeShow?: () => void | Promise<void>
  /** Extra padding around the spotlight (px) */
  spotlightPadding?: number
}

interface WalkthroughTourProps {
  /** Unique key for localStorage persistence */
  tourId: string
  /** Array of steps */
  steps: TourStep[]
  /** Called when tour finishes or is skipped */
  onComplete?: () => void
  /** Force-show even if previously completed */
  forceShow?: boolean
  /** Show on first render automatically */
  autoStart?: boolean
  /** Render a trigger button to start the tour */
  children?: (startTour: () => void) => ReactNode
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

const OVERLAY_Z = 99990
const TOOLTIP_Z = 99995
const SPOTLIGHT_PADDING_DEFAULT = 8
const SPOTLIGHT_RADIUS = 12

function getStorageKey(tourId: string) {
  return `tour_completed_${tourId}`
}

function isTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(getStorageKey(tourId)) === 'true'
}

function markTourCompleted(tourId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(getStorageKey(tourId), 'true')
  }
}

function findElement(target: string): HTMLElement | null {
  // Try data-tour-step attribute first
  const byData = document.querySelector<HTMLElement>(
    `[data-tour-step="${target}"]`
  )
  if (byData) return byData
  // Fallback to CSS selector
  return document.querySelector<HTMLElement>(target)
}

function getElementRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  }
}

type ResolvedPlacement = 'top' | 'bottom' | 'left' | 'right'

function resolvePlacement(
  placement: TourStep['placement'],
  rect: Rect
): ResolvedPlacement {
  if (placement && placement !== 'auto') return placement

  const vw = window.innerWidth
  const vh = window.innerHeight
  const spaceAbove = rect.top
  const spaceBelow = vh - rect.bottom
  const spaceLeft = rect.left
  const spaceRight = vw - rect.right

  // On mobile (< 640px), prefer top/bottom
  if (vw < 640) {
    return spaceBelow >= 200 ? 'bottom' : 'top'
  }

  const maxSpace = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight)
  if (maxSpace === spaceBelow) return 'bottom'
  if (maxSpace === spaceAbove) return 'top'
  if (maxSpace === spaceRight) return 'right'
  return 'left'
}

function getTooltipPosition(
  placement: ResolvedPlacement,
  rect: Rect,
  padding: number
): { top: number; left: number; transformOrigin: string } {
  const gap = 16
  const vw = window.innerWidth
  const tooltipMaxW = Math.min(340, vw - 32)

  switch (placement) {
    case 'bottom':
      return {
        top: rect.bottom + padding + gap,
        left: Math.max(
          16,
          Math.min(rect.left + rect.width / 2 - tooltipMaxW / 2, vw - tooltipMaxW - 16)
        ),
        transformOrigin: 'top center',
      }
    case 'top':
      return {
        top: rect.top - padding - gap,
        left: Math.max(
          16,
          Math.min(rect.left + rect.width / 2 - tooltipMaxW / 2, vw - tooltipMaxW - 16)
        ),
        transformOrigin: 'bottom center',
      }
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + padding + gap,
        transformOrigin: 'left center',
      }
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - padding - gap,
        transformOrigin: 'right center',
      }
  }
}

export function WalkthroughTour({
  tourId,
  steps,
  onComplete,
  forceShow = false,
  autoStart = true,
  children,
}: WalkthroughTourProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [placement, setPlacement] = useState<ResolvedPlacement>('bottom')
  const [tooltipPos, setTooltipPos] = useState<ReturnType<typeof getTooltipPosition> | null>(null)
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number>(0)
  const prevElRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-start on mount if not completed
  useEffect(() => {
    if (!mounted) return
    if (autoStart && !forceShow && isTourCompleted(tourId)) return
    if (autoStart || forceShow) {
      // Small delay to let page render
      const timer = setTimeout(() => setIsActive(true), 800)
      return () => clearTimeout(timer)
    }
  }, [mounted, autoStart, forceShow, tourId])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const endTour = useCallback(
    (completed: boolean) => {
      // Remove highlight from previous element
      if (prevElRef.current) {
        prevElRef.current.style.position = ''
        prevElRef.current.style.zIndex = ''
        prevElRef.current.style.pointerEvents = ''
        prevElRef.current = null
      }
      setIsActive(false)
      setTargetRect(null)
      setTooltipPos(null)
      if (completed) {
        markTourCompleted(tourId)
      }
      onComplete?.()
    },
    [tourId, onComplete]
  )

  const goToStep = useCallback(
    async (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= steps.length) {
        endTour(true)
        return
      }

      // Remove highlight from previous element
      if (prevElRef.current) {
        prevElRef.current.style.position = ''
        prevElRef.current.style.zIndex = ''
        prevElRef.current.style.pointerEvents = ''
        prevElRef.current = null
      }

      const step = steps[stepIndex]

      // Run beforeShow callback
      if (step.beforeShow) {
        await step.beforeShow()
        // Wait for DOM to update
        await new Promise((r) => setTimeout(r, 350))
      }

      setCurrentStep(stepIndex)

      // Find and measure target element
      const el = findElement(step.target)
      if (!el) {
        // If element not found, show tooltip centered
        setTargetRect(null)
        setTooltipPos({
          top: window.innerHeight / 2 - 100,
          left: Math.max(16, window.innerWidth / 2 - 170),
          transformOrigin: 'center center',
        })
        setPlacement('bottom')
        return
      }

      // Scroll element into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

      // Wait for scroll to settle
      await new Promise((r) => setTimeout(r, 400))

      const padding = step.spotlightPadding ?? SPOTLIGHT_PADDING_DEFAULT
      const rect = getElementRect(el)
      const resolved = resolvePlacement(step.placement, rect)
      const pos = getTooltipPosition(resolved, rect, padding)

      // Ensure tooltip is not translated off-screen vertically
      if (resolved === 'top') {
        pos.top = Math.max(16, pos.top - 200) // subtract estimated tooltip height
      }
      if (resolved === 'left' || resolved === 'right') {
        pos.top = pos.top - 80 // center vertically around midpoint
      }

      // Elevate target element above overlay
      const computedPosition = window.getComputedStyle(el).position
      if (computedPosition === 'static') {
        el.style.position = 'relative'
      }
      el.style.zIndex = String(OVERLAY_Z + 2)
      el.style.pointerEvents = 'auto'
      prevElRef.current = el

      setTargetRect(rect)
      setPlacement(resolved)
      setTooltipPos(pos)
    },
    [steps, endTour]
  )

  // Recalculate position on resize/scroll
  useEffect(() => {
    if (!isActive) return

    function recalc() {
      const step = steps[currentStep]
      if (!step) return
      const el = findElement(step.target)
      if (!el) return

      const padding = step.spotlightPadding ?? SPOTLIGHT_PADDING_DEFAULT
      const rect = getElementRect(el)
      const resolved = resolvePlacement(step.placement, rect)
      const pos = getTooltipPosition(resolved, rect, padding)

      if (resolved === 'top') {
        pos.top = Math.max(16, pos.top - 200)
      }
      if (resolved === 'left' || resolved === 'right') {
        pos.top = pos.top - 80
      }

      setTargetRect(rect)
      setPlacement(resolved)
      setTooltipPos(pos)
    }

    function onEvent() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(recalc)
    }

    window.addEventListener('resize', onEvent)
    window.addEventListener('scroll', onEvent, true)
    return () => {
      window.removeEventListener('resize', onEvent)
      window.removeEventListener('scroll', onEvent, true)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, currentStep, steps])

  // Navigate to step when currentStep changes
  useEffect(() => {
    if (isActive) {
      goToStep(currentStep)
    }
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') endTour(false)
      if (e.key === 'ArrowRight' || e.key === 'Enter') goToStep(currentStep + 1)
      if (e.key === 'ArrowLeft') goToStep(Math.max(0, currentStep - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isActive, currentStep, goToStep, endTour])

  if (!mounted) return children ? <>{children(startTour)}</> : null

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const padding = step?.spotlightPadding ?? SPOTLIGHT_PADDING_DEFAULT

  const overlayContent = (
    <AnimatePresence>
      {isActive && step && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0"
            style={{ zIndex: OVERLAY_Z }}
            onClick={() => endTour(false)}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - padding}
                      y={targetRect.top - padding}
                      width={targetRect.width + padding * 2}
                      height={targetRect.height + padding * 2}
                      rx={SPOTLIGHT_RADIUS}
                      ry={SPOTLIGHT_RADIUS}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.6)"
                mask="url(#tour-spotlight-mask)"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => endTour(false)}
              />
            </svg>

            {/* Spotlight border ring */}
            {targetRect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="absolute rounded-xl ring-2 ring-olive-400/60 dark:ring-olive-500/50 pointer-events-none"
                style={{
                  top: targetRect.top - padding,
                  left: targetRect.left - padding,
                  width: targetRect.width + padding * 2,
                  height: targetRect.height + padding * 2,
                  boxShadow: '0 0 0 4px rgba(74,93,35,0.15), 0 0 30px rgba(74,93,35,0.1)',
                }}
              />
            )}
          </motion.div>

          {/* Tooltip card */}
          {tooltipPos && (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9, y: placement === 'top' ? 10 : placement === 'bottom' ? -10 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.15 }}
              className="fixed w-[min(340px,calc(100vw-32px))]"
              style={{
                zIndex: TOOLTIP_Z,
                top: tooltipPos.top,
                left: tooltipPos.left,
                transformOrigin: tooltipPos.transformOrigin,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 border border-stone-200/60 dark:border-white/[0.1] overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-stone-100 dark:bg-stone-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-olive-500 to-olive-600"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentStep + 1) / steps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>

                <div className="p-5">
                  {/* Step counter + close */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-olive-600 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/30 px-2 py-0.5 rounded-full">
                      {currentStep + 1} of {steps.length}
                    </span>
                    <button
                      onClick={() => endTour(false)}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      aria-label="Close tour"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Icon + Title */}
                  <div className="flex items-start gap-3 mb-2">
                    {step.icon && (
                      <div className="shrink-0 p-2 rounded-xl bg-olive-50 dark:bg-olive-900/20 text-olive-600 dark:text-olive-400">
                        {step.icon}
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-stone-900 dark:text-white leading-snug pt-1">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-5 ml-0">
                    {step.description}
                  </p>

                  {/* Navigation */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => endTour(false)}
                      className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors px-2 py-1"
                    >
                      Skip tour
                    </button>
                    <div className="flex items-center gap-2">
                      {!isFirst && (
                        <button
                          onClick={() => goToStep(currentStep - 1)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Back
                        </button>
                      )}
                      <button
                        onClick={() => goToStep(currentStep + 1)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white shadow-sm transition-all"
                      >
                        {isLast ? (
                          'Got it!'
                        ) : (
                          <>
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5 mt-3">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'w-6 bg-olive-500'
                        : i < currentStep
                          ? 'w-1.5 bg-olive-400/50'
                          : 'w-1.5 bg-white/40'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {children?.(startTour)}
      {mounted && createPortal(overlayContent, document.body)}
    </>
  )
}

/** Helper: trigger button to restart the tour */
export function TourTriggerButton({
  onClick,
  label = 'Take a tour',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-olive-700 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/20 hover:bg-olive-100 dark:hover:bg-olive-900/30 border border-olive-200/60 dark:border-olive-800/40 transition-colors"
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </button>
  )
}
