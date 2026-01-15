'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Globe } from 'lucide-react'
import { useInstallPrompt } from '@/lib/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { transitions } from '@/lib/animations/spring-configs'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function InstallBanner() {
  const { canInstall, isInstalling, install } = useInstallPrompt()
  const [showBanner, setShowBanner] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

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
    if (canInstall && !hasInteracted) {
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [canInstall, hasInteracted])

  const handleInstall = async () => {
    setHasInteracted(true)
    try {
      await install()
      setShowBanner(false)
    } catch {
      // User cancelled or error occurred
    }
  }

  const handleDismiss = () => {
    setHasInteracted(true)
    setShowBanner(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  return (
    <AnimatePresence>
      {showBanner && canInstall && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={transitions.natural}
        >
          <div className="max-w-lg mx-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-4 text-white">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="p-3 bg-white/20 rounded-xl flex-shrink-0">
                  <div className="relative">
                    <Smartphone className="h-8 w-8" />
                    <Globe className="h-4 w-4 absolute -bottom-1 -right-1 text-teal-200" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">Install Adventure Log</h3>
                  <p className="text-sm text-teal-100 mt-1">
                    Add to your home screen for quick access, offline support, and a native app experience.
                  </p>

                  {/* Benefits */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      Works Offline
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      Fast & Native
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      No App Store
                    </span>
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
                          Install App
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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
