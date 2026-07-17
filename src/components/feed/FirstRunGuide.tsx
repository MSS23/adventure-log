'use client'

/**
 * FirstRunGuide — the brand-new-account explainer. Lived on /dashboard until
 * that page was retired (Feed is the home surface now): explain the core loop
 * in one glance, give one obvious primary action, and offer a few
 * low-friction starting points.
 *
 * The primary action is bulk photo import (EXIF GPS → auto-grouped, pinned
 * albums) because it is the fastest route from empty account to a pinned
 * globe; manual album creation is the secondary path.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Camera, Globe as GlobeIcon, Share2, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotionList, MotionItem, MotionReveal } from '@/components/animations/MotionList'
import { MotionCard } from '@/components/ui/card'
import { log } from '@/lib/utils/logger'

// Dismissal is device-local: the guide auto-retires once the first album
// exists, so a persistent flag is only needed for "stop showing me this".
const DISMISS_KEY = 'al_first_run_guide_dismissed'

export function FirstRunGuide() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true)
      }
    } catch {
      // Storage unavailable (private mode etc.) — just show the guide.
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Non-fatal; the guide will reappear next session.
    }
    log.userAction('dismissed-first-run-guide', undefined, { component: 'FirstRunGuide' })
  }

  if (dismissed) return null

  const loop = [
    {
      icon: <Camera className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Capture in a minute',
      body: 'Choose photos. Adventure Log groups them by date and place for you to approve.',
    },
    {
      icon: <GlobeIcon className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Relive it on your globe',
      body: 'Every memory becomes a place, route, and moment you can return to.',
    },
    {
      icon: <Share2 className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Keep the loop going',
      body: 'Share with friends, save their places, and turn discoveries into a trip.',
    },
  ]

  const starters = [
    'A weekend city break',
    'Your last big trip',
    'The place you call home',
  ]

  return (
    <div className="space-y-8 mb-10">
      {/* Core-loop explainer */}
      <section aria-labelledby="how-it-works-heading" className="space-y-4">
        <MotionReveal>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="al-eyebrow mb-0.5">How Adventure Log works</p>
              <h3 id="how-it-works-heading" className="al-display text-xl md:text-2xl">
                From camera roll to living memory
              </h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Capture → relive → share → discover → plan → travel → capture.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss guide"
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </MotionReveal>
        <MotionList className="grid grid-cols-1 sm:grid-cols-3 gap-4" stagger={0.06}>
          {loop.map((step, i) => (
            <MotionItem key={step.title}>
              <MotionCard flat className="h-full gap-0 py-0 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {step.icon}
                  </span>
                  <span className="al-eyebrow">Step {i + 1}</span>
                </div>
                <h4 className="font-heading text-base font-semibold leading-tight text-foreground mb-1">
                  {step.title}
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </MotionCard>
            </MotionItem>
          ))}
        </MotionList>
      </section>

      {/* Primary CTA — the one obvious next action */}
      <MotionReveal delay={0.1}>
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-resting)] sm:p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent"
          >
            <MapPin className="h-6 w-6" strokeWidth={1.8} />
          </motion.div>
          <h3 className="al-display text-xl md:text-2xl">
            Bring your camera roll to life
          </h3>
          <p className="mx-auto mt-1 mb-5 max-w-md text-sm text-muted-foreground">
            Pick a batch of trip photos. We read dates and locations, suggest
            memory groups, and let you approve everything before it is kept.
          </p>
          <Button variant="coral" asChild>
            <Link href="/albums/import">
              <Camera className="h-4 w-4" strokeWidth={1.8} />
              Import from camera roll
            </Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Prefer to start from scratch?{' '}
            <Link
              href="/albums/new"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Create from scratch
            </Link>
          </p>

          {/* Low-friction starting points */}
          <div className="mt-6">
            <p className="al-eyebrow mb-2.5">Not sure where to start? Try</p>
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <Link
                  key={s}
                  href="/albums/new"
                  className="cursor-pointer rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </MotionReveal>
    </div>
  )
}
