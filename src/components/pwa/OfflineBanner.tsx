'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/usePWA'
import { transitions } from '@/lib/animations/spring-configs'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={transitions.natural}
        >
          <div className="pointer-events-auto bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-3 max-w-md w-full">
            <div className="p-2 bg-amber-600 rounded-lg">
              <WifiOff className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">You&apos;re offline</p>
              <p className="text-xs text-amber-100 truncate">
                Some features may be unavailable
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-amber-600 rounded-lg transition-colors flex-shrink-0"
              aria-label="Retry connection"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
