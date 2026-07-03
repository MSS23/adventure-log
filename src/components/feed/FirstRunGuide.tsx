'use client'

/**
 * FirstRunGuide — the brand-new-account explainer. Lived on /dashboard until
 * that page was retired (Feed is the home surface now): explain the core loop
 * in one glance, give one obvious primary action, and offer a few
 * low-friction starting points.
 */

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Camera, Globe as GlobeIcon, Share2, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotionList, MotionItem, MotionReveal } from '@/components/animations/MotionList'
import { MotionCard } from '@/components/ui/card'

export function FirstRunGuide() {
  const loop = [
    {
      icon: <Camera className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Log a trip',
      body: 'Add photos, a place, and a date. That’s an album.',
    },
    {
      icon: <GlobeIcon className="h-5 w-5" strokeWidth={1.8} />,
      title: 'See it on your globe',
      body: 'Every album drops a pin on your own 3D world.',
    },
    {
      icon: <Share2 className="h-5 w-5" strokeWidth={1.8} />,
      title: 'Share the journey',
      body: 'Build a passport, get your year Wrapped, share it.',
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
          <p className="al-eyebrow mb-0.5">How Adventure Log works</p>
          <h3 id="how-it-works-heading" className="al-display text-xl md:text-2xl">
            Three steps to your map of the world
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Turn your travels into a living atlas. It starts with a single album.
          </p>
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
          <h3 className="al-display text-xl md:text-2xl">Drop your first pin</h3>
          <p className="mx-auto mt-1 mb-5 max-w-md text-sm text-muted-foreground">
            Your world map is empty right now. Create one album and watch it come alive.
          </p>
          <Button variant="coral" asChild>
            <Link href="/albums/new">
              <Calendar className="h-4 w-4" strokeWidth={1.8} />
              Create your first album
            </Link>
          </Button>

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
