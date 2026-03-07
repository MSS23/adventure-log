'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, RefreshCw, Check } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/usePWA'
import { transitions } from '@/lib/animations/spring-configs'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

type ConnectionState = 'offline' | 'reconnecting' | 'online'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const [connectionState, setConnectionState] = useState<ConnectionState>(isOnline ? 'online' : 'offline')
  const [showBanner, setShowBanner] = useState(false)
  const wasOfflineRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  // Track connection state changes
  useEffect(() => {
    if (!isOnline) {
      // Going offline
      wasOfflineRef.current = true
      setConnectionState('offline')
      setShowBanner(true)
    } else if (wasOfflineRef.current) {
      // Coming back online after being offline
      setConnectionState('reconnecting')

      // Brief reconnecting state, then show online celebration
      const reconnectTimer = setTimeout(() => {
        setConnectionState('online')
      }, 800)

      // Auto-dismiss banner after celebration
      const dismissTimer = setTimeout(() => {
        setShowBanner(false)
        wasOfflineRef.current = false
      }, 3000)

      return () => {
        clearTimeout(reconnectTimer)
        clearTimeout(dismissTimer)
      }
    }
  }, [isOnline])

  const handleRefresh = () => {
    window.location.reload()
  }

  const getBannerConfig = () => {
    switch (connectionState) {
      case 'offline':
        return {
          bg: 'bg-amber-500',
          iconBg: 'bg-amber-600',
          shadow: 'shadow-amber-500/25',
          Icon: WifiOff,
          title: "You're offline",
          subtitle: 'Some features may be unavailable',
          showRefresh: true
        }
      case 'reconnecting':
        return {
          bg: 'bg-blue-500',
          iconBg: 'bg-blue-600',
          shadow: 'shadow-blue-500/25',
          Icon: RefreshCw,
          title: 'Reconnecting...',
          subtitle: 'Restoring connection',
          showRefresh: false,
          iconSpin: true
        }
      case 'online':
        return {
          bg: 'bg-green-500',
          iconBg: 'bg-green-600',
          shadow: 'shadow-green-500/25',
          Icon: wasOfflineRef.current ? Check : Wifi,
          title: 'Back online!',
          subtitle: 'All features are available',
          showRefresh: false
        }
    }
  }

  const config = getBannerConfig()

  return (
    <AnimatePresence mode="wait">
      {showBanner && (
        <motion.div
          key={connectionState}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.95 }}
          transition={transitions.natural}
        >
          <motion.div
            className={cn(
              "pointer-events-auto text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md w-full",
              config.bg,
              config.shadow
            )}
            layout={!prefersReducedMotion}
          >
            {/* Icon with animation */}
            <motion.div
              className={cn("p-2 rounded-lg", config.iconBg)}
              initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
            >
              <config.Icon
                className={cn(
                  "h-4 w-4",
                  connectionState === 'reconnecting' && "animate-spin"
                )}
              />
            </motion.div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <motion.p
                className="text-sm font-medium"
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {config.title}
              </motion.p>
              <motion.p
                className="text-xs opacity-90 truncate"
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                animate={{ opacity: 0.9, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                {config.subtitle}
              </motion.p>
            </div>

            {/* Action button */}
            <AnimatePresence mode="wait">
              {config.showRefresh && (
                <motion.button
                  onClick={handleRefresh}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex-shrink-0",
                    connectionState === 'offline' ? "hover:bg-amber-600" : "hover:bg-current/20"
                  )}
                  aria-label="Retry connection"
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Success checkmark animation when reconnected */}
            {connectionState === 'online' && !prefersReducedMotion && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4, type: 'spring' as const }}
                className="p-2"
              >
                <Check className="h-4 w-4" />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
