'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NumberCountUpProps {
  /** Target number to count up to. */
  value: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /** Locale used by Intl.NumberFormat. Defaults to user agent locale. */
  locale?: string
  /** Optional Intl.NumberFormat options (e.g. compact notation). */
  formatOptions?: Intl.NumberFormatOptions
  /** className applied to the wrapping span. */
  className?: string
  /**
   * Whether to wait for the element to enter the viewport before starting.
   * Defaults to true so off-screen counters don't burn animation work.
   */
  triggerOnView?: boolean
}

/**
 * Count-up number animation with viewport-aware triggering and proper
 * locale formatting. Used by the public marketing pages where the headline
 * value matters more than a tiny code-size win.
 *
 * Differs from `AnimatedCounter` in `animated-count.tsx`:
 *   - Counts up from 0 → value on mount/in-view (not just spring-tweens
 *     between successive values).
 *   - Uses Intl.NumberFormat for thousands separators + locale-correct
 *     digits, instead of `1.2K`-style compact notation.
 */
export function NumberCountUp({
  value,
  durationMs = 1200,
  locale,
  formatOptions,
  className,
  triggerOnView = true,
}: NumberCountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const motionValue = useMotionValue(0)
  // Spring for a more "alive" feel than a linear lerp, but tightly damped
  // so it lands cleanly on the integer.
  const spring = useSpring(motionValue, {
    stiffness: 60,
    damping: 18,
    duration: durationMs,
    restDelta: 0.001,
  })

  const formatter = new Intl.NumberFormat(locale, formatOptions)
  const display = useTransform(spring, (v) => formatter.format(Math.round(v)))

  useEffect(() => {
    if (!triggerOnView || inView) {
      motionValue.set(value)
    }
  }, [inView, value, motionValue, triggerOnView])

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums', className)}
      aria-label={String(value)}
    >
      {display}
    </motion.span>
  )
}
