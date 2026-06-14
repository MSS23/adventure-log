'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { motion, MotionConfig } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

interface PageHeaderProps {
  /** Small uppercase mono label shown above the title. */
  eyebrow?: string
  /** Main page title (rendered in the editorial serif display face). */
  title: React.ReactNode
  /** Optional supporting line under the title. */
  subtitle?: React.ReactNode
  /** Optional leading glyph rendered before the title. */
  icon?: React.ReactNode
  /** Show the Back affordance. Defaults to true. */
  showBack?: boolean
  /**
   * Where Back navigates. When provided, renders a Link to this route;
   * otherwise it pops browser history (falling back to Home if there is none).
   */
  backHref?: string
  /** Show the Home affordance. Defaults to true. */
  showHome?: boolean
  /** Destination for the Home button. Defaults to /feed. */
  homeHref?: string
  /** Right-aligned actions (buttons, links, toggles). */
  actions?: React.ReactNode
  className?: string
}

/**
 * Standard page header used across secondary / "orphan" pages (Saved, Wishlist,
 * Countries, Passport, Achievements, Analytics, Travel Twins, …) that aren't in
 * the primary sidebar/bottom nav. Provides consistent Back + Home navigation so
 * users are never stranded, plus the shared eyebrow / display-title / subtitle
 * typography. Honours the warm Field Notebook token system and reduced-motion.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  showBack = true,
  backHref,
  showHome = true,
  homeHref = '/feed',
  actions,
  className,
}: PageHeaderProps) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(homeHref)
    }
  }

  const navPillClass = cn(
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium cursor-pointer',
    'text-[color:var(--color-ink-soft)] bg-[color:var(--color-ivory-alt)]',
    'border border-[color:var(--color-line-warm)]',
    'transition-colors duration-200 hover:text-[color:var(--color-ink)] hover:bg-white/70 dark:hover:bg-white/[0.06]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40 active:scale-[0.97]',
  )

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EDITORIAL_EASE }}
        className={cn('space-y-4', className)}
      >
        {/* Navigation row — back / home */}
        {(showBack || showHome) && (
          <div className="flex items-center gap-2">
            {showBack &&
              (backHref ? (
                <Link href={backHref} className={navPillClass}>
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                  Back
                </Link>
              ) : (
                <button type="button" onClick={handleBack} className={navPillClass} aria-label="Go back">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                  Back
                </button>
              ))}
            {showHome && (
              <Link href={homeHref} className={navPillClass} aria-label="Go to home feed">
                <Home className="h-4 w-4" strokeWidth={1.8} />
                <span className="hidden xs:inline sm:inline">Home</span>
              </Link>
            )}
          </div>
        )}

        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <header className="min-w-0 space-y-1">
            {eyebrow && <p className="al-eyebrow">{eyebrow}</p>}
            <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
              {icon}
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[color:var(--color-ink-soft)]">{subtitle}</p>
            )}
          </header>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </motion.div>
    </MotionConfig>
  )
}

export default PageHeader
