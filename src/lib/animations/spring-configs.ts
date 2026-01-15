/**
 * Centralized spring configurations for consistent animations across the app
 * Using react-spring and framer-motion compatible configs
 */

// Quick snap - buttons, toggles, immediate feedback
export const snapSpring = {
  tension: 500,
  friction: 30,
  // Framer Motion equivalent
  stiffness: 500,
  damping: 30,
}

// Natural motion - cards, photos, general UI
export const naturalSpring = {
  tension: 300,
  friction: 25,
  // Framer Motion equivalent
  stiffness: 300,
  damping: 25,
}

// Smooth glide - page transitions, modals
export const glideSpring = {
  tension: 200,
  friction: 20,
  // Framer Motion equivalent
  stiffness: 200,
  damping: 20,
}

// Globe rotation - smooth, weighty feel
export const globeSpring = {
  tension: 100,
  friction: 15,
  mass: 1,
  // Framer Motion equivalent
  stiffness: 100,
  damping: 15,
}

// Bounce - playful interactions
export const bounceSpring = {
  tension: 400,
  friction: 10,
  // Framer Motion equivalent
  stiffness: 400,
  damping: 10,
}

// Gesture thresholds
export const gestureConfig = {
  swipeVelocity: 500, // px/s to trigger swipe action
  pinchSensitivity: 0.5, // scale factor
  dragDistance: 100, // px to confirm drag action
  doubleTapWindow: 300, // ms between taps
  longPressDelay: 500, // ms to trigger long press
}

// Timing standards (in ms)
export const timing = {
  instant: 100, // button press, hover
  micro: 200, // count change, state toggle
  transition: 300, // page, modal, drawer
  reveal: 400, // scroll-triggered
  stagger: 500, // staggered reveals
}

// Easing presets
export const easing = {
  smooth: [0.25, 0.1, 0.25, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  snap: [0.4, 0, 0.2, 1] as const,
  ease: [0.4, 0, 0.2, 1] as const,
}

// Framer Motion transition presets
export const transitions = {
  snap: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
  },
  natural: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  },
  glide: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
  },
  bounce: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10,
  },
}

// Reduced motion variants - instant transitions for accessibility
export const reducedMotionTransitions = {
  snap: { duration: 0 },
  natural: { duration: 0 },
  glide: { duration: 0 },
  bounce: { duration: 0 },
}

// Helper to get appropriate transition based on motion preference
export function getTransition(
  name: keyof typeof transitions,
  prefersReducedMotion: boolean
) {
  return prefersReducedMotion ? reducedMotionTransitions[name] : transitions[name]
}

// Common animation variants
export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

// Reduced motion variants - no transform, just opacity
export const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// Stagger children config
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

// Button press animation
export const buttonPressVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
}

export const buttonPressReducedMotion = {
  tap: {},
  hover: {},
}
