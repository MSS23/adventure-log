'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Globe, Share, PlusSquare, Check } from 'lucide-react'
import { useInstallPrompt } from '@/lib/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { transitions } from '@/lib/animations/spring-configs'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Detect iOS Safari
function useIOSDetection() {
  const [isIOSSafari, setIsIOSSafari] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true

    setIsIOSSafari(isIOS && isSafari)
    setIsStandalone(standalone)
  }, [])

  return { isIOSSafari, isStandalone }
}

// Confetti particle component
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const angle = (index * 36) * (Math.PI / 180)
  const distance = 80 + Math.random() * 60

  return (
    <motion.div
      className={cn("absolute w-3 h-3 rounded-full", color)}
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 1
      }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 30,
        scale: [0, 1, 0.5],
        opacity: [1, 1, 0],
        rotate: Math.random() * 360
      }}
      transition={{
        duration: 0.8,
        delay: index * 0.03,
        ease: 'easeOut'
      }}
    />
  )
}

export function InstallBanner() {
  const { canInstall, isInstalling, install } = useInstallPrompt()
  const { isIOSSafari, isStandalone } = useIOSDetection()
  const [showBanner, setShowBanner] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Show banner for iOS Safari or when canInstall is true
  const shouldShowBanner = useMemo(() => {
    if (isStandalone) return false // Already installed
    return canInstall || isIOSSafari
  }, [canInstall, isIOSSafari, isStandalone])

  useEffect(() => {
    // Check if user has dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return // Still within dismiss period
      }
    }

    // Show banner after a short delay if app is installable
    if (shouldShowBanner && !hasInteracted) {
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [shouldShowBanner, hasInteracted])

  const handleInstall = async () => {
    setHasInteracted(true)

    if (isIOSSafari) {
      // Show iOS-specific instructions
      setShowIOSInstructions(true)
      return
    }

    try {
      const success = await install()
      if (success) {
        // Show celebration animation
        setShowCelebration(true)
        setTimeout(() => {
          setShowCelebration(false)
          setShowBanner(false)
        }, 2000)
      }
    } catch {
      // User cancelled or error occurred
    }
  }

  const handleDismiss = () => {
    setHasInteracted(true)
    setShowBanner(false)
    setShowIOSInstructions(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const confettiColors = [
    'bg-teal-400',
    'bg-cyan-400',
    'bg-emerald-400',
    'bg-blue-400',
    'bg-purple-400'
  ]

  return (
    <>
      {/* Install Success Celebration */}
      <AnimatePresence>
        {showCelebration && !prefersReducedMotion && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Center confetti burst */}
            <div className="relative">
              {[...Array(10)].map((_, i) => (
                <ConfettiParticle
                  key={i}
                  index={i}
                  color={confettiColors[i % confettiColors.length]}
                />
              ))}

              {/* Success checkmark */}
              <motion.div
                className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4, type: 'spring' as const }}
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>
            </div>

            {/* Success message */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 bg-white rounded-xl shadow-xl px-6 py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-lg font-semibold text-gray-900">App Installed!</p>
              <p className="text-sm text-gray-500">Find it on your home screen</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Banner */}
      <AnimatePresence mode="wait">
        {showBanner && shouldShowBanner && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            transition={transitions.natural}
          >
            <div className="max-w-lg mx-auto">
              <motion.div
                className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-4 text-white"
                layout={!prefersReducedMotion}
              >
                <AnimatePresence mode="wait">
                  {showIOSInstructions ? (
                    /* iOS Safari Instructions */
                    <motion.div
                      key="ios-instructions"
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">How to Install</h3>
                        <button
                          onClick={handleDismiss}
                          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                          aria-label="Close"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <ol className="space-y-3">
                        <motion.li
                          className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold">1</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Share className="h-4 w-4" />
                              <span className="font-medium">Tap the Share button</span>
                            </div>
                            <p className="text-xs text-teal-100 mt-0.5">
                              Located at the bottom of your Safari browser
                            </p>
                          </div>
                        </motion.li>

                        <motion.li
                          className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold">2</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <PlusSquare className="h-4 w-4" />
                              <span className="font-medium">Add to Home Screen</span>
                            </div>
                            <p className="text-xs text-teal-100 mt-0.5">
                              Scroll down and tap this option
                            </p>
                          </div>
                        </motion.li>

                        <motion.li
                          className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold">3</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              <span className="font-medium">Tap Add</span>
                            </div>
                            <p className="text-xs text-teal-100 mt-0.5">
                              Confirm to add the app to your home screen
                            </p>
                          </div>
                        </motion.li>
                      </ol>

                      <Button
                        onClick={handleDismiss}
                        className="w-full bg-white text-teal-700 hover:bg-teal-50 font-semibold"
                      >
                        Got it!
                      </Button>
                    </motion.div>
                  ) : (
                    /* Standard Install Banner */
                    <motion.div
                      key="standard-banner"
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
                      className="flex items-start gap-4"
                    >
                      {/* Icon */}
                      <motion.div
                        className="p-3 bg-white/20 rounded-xl flex-shrink-0"
                        initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring' as const, stiffness: 300, damping: 20, delay: 0.1 }}
                      >
                        <div className="relative">
                          <Smartphone className="h-8 w-8" />
                          <Globe className="h-4 w-4 absolute -bottom-1 -right-1 text-teal-200" />
                        </div>
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">Install Adventure Log</h3>
                        <p className="text-sm text-teal-100 mt-1">
                          Add to your home screen for quick access, offline support, and a native app experience.
                        </p>

                        {/* Benefits */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {['Works Offline', 'Fast & Native', 'No App Store'].map((benefit, i) => (
                            <motion.span
                              key={benefit}
                              className="text-xs bg-white/20 px-2 py-1 rounded-full"
                              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 + i * 0.1 }}
                            >
                              {benefit}
                            </motion.span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-4"
                          >
                            {isInstalling ? (
                              <>
                                <Download className="h-4 w-4 mr-2 animate-bounce" />
                                Installing...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                {isIOSSafari ? 'How to Install' : 'Install App'}
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                          >
                            Not Now
                          </Button>
                        </div>
                      </div>

                      {/* Close button */}
                      <button
                        onClick={handleDismiss}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
