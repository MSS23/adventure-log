'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { usePWAUpdate } from '@/lib/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { transitions } from '@/lib/animations/spring-configs'

export function UpdateNotification() {
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = usePWAUpdate()
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    if (updateAvailable) {
      setShowNotification(true)
    }
  }, [updateAvailable])

  const handleUpdate = async () => {
    await applyUpdate()
  }

  const handleDismiss = () => {
    setShowNotification(false)
    dismissUpdate()
  }

  return (
    <AnimatePresence>
      {showNotification && updateAvailable && (
        <motion.div
          className="fixed bottom-20 md:bottom-4 right-4 z-50"
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={transitions.natural}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg flex-shrink-0">
                <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Update Available
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A new version of Adventure Log is ready
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1 h-7"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Update Now
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-xs px-3 py-1 h-7 text-gray-500"
                  >
                    Later
                  </Button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
