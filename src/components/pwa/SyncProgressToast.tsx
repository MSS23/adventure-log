'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Check, AlertCircle, RefreshCw, X } from 'lucide-react'
import { useOfflineSync } from '@/lib/hooks/useOfflineSync'
import { Progress } from '@/components/ui/progress'
import { transitions } from '@/lib/animations/spring-configs'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

export function SyncProgressToast() {
  const { queueItems, isSyncing, isOnline } = useOfflineSync()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [showToast, setShowToast] = useState(false)
  const [previousPendingCount, setPreviousPendingCount] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  // Calculate pending and completed counts
  const { pendingCount, completedCount, failedCount, totalCount } = useMemo(() => {
    const pending = queueItems.filter(item =>
      item.status === 'pending' || item.status === 'uploading'
    ).length
    const completed = queueItems.filter(item => item.status === 'completed').length
    const failed = queueItems.filter(item => item.status === 'failed').length

    return {
      pendingCount: pending,
      completedCount: completed,
      failedCount: failed,
      totalCount: queueItems.length
    }
  }, [queueItems])

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (totalCount === 0) return 0
    return Math.round((completedCount / totalCount) * 100)
  }, [completedCount, totalCount])

  // Track sync state changes
  useEffect(() => {
    if (isSyncing && pendingCount > 0) {
      setSyncState('syncing')
      setShowToast(true)
      setPreviousPendingCount(pendingCount)
    } else if (!isSyncing && previousPendingCount > 0 && pendingCount === 0) {
      // Sync completed successfully
      if (failedCount === 0) {
        setSyncState('success')
        // Auto-hide after success
        const timer = setTimeout(() => {
          setShowToast(false)
          setSyncState('idle')
        }, 3000)
        return () => clearTimeout(timer)
      } else {
        setSyncState('error')
      }
    } else if (failedCount > 0 && !isSyncing) {
      setSyncState('error')
      setShowToast(true)
    }
  }, [isSyncing, pendingCount, previousPendingCount, failedCount])

  // Show toast when going online with pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && syncState === 'idle') {
      setShowToast(true)
      setSyncState('syncing')
    }
  }, [isOnline, pendingCount, syncState])

  const handleDismiss = () => {
    setShowToast(false)
    setSyncState('idle')
  }

  const getToastConfig = () => {
    switch (syncState) {
      case 'syncing':
        return {
          icon: Cloud,
          iconClass: 'text-teal-500 animate-bounce',
          bgClass: 'bg-white',
          borderClass: 'border-teal-200',
          title: 'Syncing changes...',
          subtitle: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} remaining`,
          showProgress: true,
          showDismiss: false
        }
      case 'success':
        return {
          icon: Check,
          iconClass: 'text-green-500',
          bgClass: 'bg-green-50',
          borderClass: 'border-green-200',
          title: 'All synced!',
          subtitle: 'Your changes are saved',
          showProgress: false,
          showDismiss: false
        }
      case 'error':
        return {
          icon: AlertCircle,
          iconClass: 'text-red-500',
          bgClass: 'bg-red-50',
          borderClass: 'border-red-200',
          title: 'Sync incomplete',
          subtitle: `${failedCount} item${failedCount !== 1 ? 's' : ''} failed`,
          showProgress: false,
          showDismiss: true
        }
      default:
        return {
          icon: Cloud,
          iconClass: 'text-gray-400',
          bgClass: 'bg-white',
          borderClass: 'border-gray-200',
          title: 'Ready to sync',
          subtitle: '',
          showProgress: false,
          showDismiss: true
        }
    }
  }

  const config = getToastConfig()

  return (
    <AnimatePresence>
      {showToast && syncState !== 'idle' && (
        <motion.div
          className="fixed bottom-24 right-4 z-50 max-w-xs w-full"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.9 }}
          transition={transitions.natural}
        >
          <motion.div
            className={cn(
              "rounded-xl shadow-lg border p-4",
              config.bgClass,
              config.borderClass
            )}
            layout={!prefersReducedMotion}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.div
                initial={prefersReducedMotion ? {} : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
              >
                <config.icon className={cn("h-5 w-5", config.iconClass)} />
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.p
                  className="text-sm font-medium text-gray-900"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {config.title}
                </motion.p>

                {config.subtitle && (
                  <motion.p
                    className="text-xs text-gray-500 mt-0.5"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {config.subtitle}
                  </motion.p>
                )}

                {/* Progress bar */}
                {config.showProgress && (
                  <motion.div
                    className="mt-2"
                    initial={prefersReducedMotion ? {} : { opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    style={{ originX: 0 }}
                  >
                    <Progress value={progress} className="h-1.5" />
                    <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
                  </motion.div>
                )}

                {/* Retry button for errors */}
                {syncState === 'error' && (
                  <motion.button
                    className="mt-2 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
                    initial={prefersReducedMotion ? {} : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry failed items
                  </motion.button>
                )}
              </div>

              {/* Dismiss button */}
              {config.showDismiss && (
                <motion.button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
