'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

// Single source of truth for reduced-motion handling across the app.
// Setting `reducedMotion="user"` makes every framer-motion animation respect
// the visitor's OS-level prefers-reduced-motion setting unless an explicit
// override is provided locally — without this, only components that import
// useReducedMotion individually honour the preference, leaving Wrapped,
// AchievementUnlock, AlbumHero pulses, ScrollReveal, etc. ignoring it.
export function GlobalMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
