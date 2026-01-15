'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Globe,
  MapPin,
  Camera,
  Plane,
  CheckCircle,
  AlertCircle,
  Clock,
  Smartphone
} from 'lucide-react'
import { useOnlineStatus, useOfflineData } from '@/lib/hooks/usePWA'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { transitions } from '@/lib/animations/spring-configs'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
}

export default function OfflinePage() {
  const router = useRouter()
  const { isOnline, connectionType } = useOnlineStatus()
  const { offlineCount, totalPending } = useOfflineData()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Auto-redirect when back online
  useEffect(() => {
    if (isOnline && retryCount > 0) {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  }, [isOnline, retryCount, router])

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)

    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (navigator.onLine) {
      router.push('/dashboard')
    } else {
      setIsRetrying(false)
    }
  }

  const features = [
    {
      icon: Camera,
      title: 'Browse Cached Photos',
      description: 'View your previously loaded travel photos',
      available: true
    },
    {
      icon: MapPin,
      title: 'Offline Location Data',
      description: 'Access cached location information',
      available: true
    },
    {
      icon: Globe,
      title: 'Interactive Globe',
      description: 'Explore your travels (limited functionality)',
      available: false
    },
    {
      icon: Plane,
      title: 'Flight Animations',
      description: 'Watch cached travel routes',
      available: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="max-w-2xl w-full space-y-6"
        variants={prefersReducedMotion ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Offline Card */}
        <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
            <CardHeader className="text-center pb-6">
              {/* Animated Icon */}
              <motion.div
                className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 relative"
                initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 15, delay: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {isOnline ? (
                    <motion.div
                      key="online"
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={prefersReducedMotion ? {} : { scale: 0 }}
                    >
                      <Wifi className="h-10 w-10 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="offline"
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={prefersReducedMotion ? {} : { scale: 0 }}
                    >
                      <WifiOff className="h-10 w-10 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pulsing ring animation when offline */}
                {!isOnline && !prefersReducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-blue-400"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <CardTitle className="text-3xl font-bold text-gray-900">
                  {isOnline ? 'Back Online!' : "You're Offline"}
                </CardTitle>
                <CardDescription className="text-lg text-gray-800 mt-2">
                  {isOnline
                    ? 'Connection restored. Redirecting you back...'
                    : 'No internet connection detected. Some features are still available!'
                  }
                </CardDescription>
              </motion.div>

              {/* Connection Status */}
              <motion.div
                className="flex items-center justify-center gap-2 mt-4"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    isOnline ? "bg-green-500" : "bg-red-500"
                  )}
                  animate={!isOnline && !prefersReducedMotion ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-sm text-gray-800">
                  {isOnline ? 'Connected' : 'Disconnected'}
                  {connectionType !== 'unknown' && ` • ${connectionType}`}
                </span>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Retry Section */}
              <motion.div
                className="text-center"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                >
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying || isOnline}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Checking Connection...
                      </>
                    ) : isOnline ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Reconnected!
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={prefersReducedMotion ? {} : { rotate: [0, 360] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          style={{ display: 'inline-flex' }}
                        >
                          <RefreshCw className="h-5 w-5 mr-2" />
                        </motion.div>
                        Try Again
                      </>
                    )}
                  </Button>
                </motion.div>

                <AnimatePresence>
                  {retryCount > 0 && !isOnline && (
                    <motion.p
                      className="text-sm text-gray-800 mt-2"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                    >
                      Attempted {retryCount} time{retryCount !== 1 ? 's' : ''}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Offline Data Status */}
              <AnimatePresence>
                {totalPending > 0 && (
                  <motion.div
                    className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                    initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                    transition={transitions.natural}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        animate={prefersReducedMotion ? {} : { rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Clock className="h-5 w-5 text-amber-600" />
                      </motion.div>
                      <h3 className="font-semibold text-amber-900">Pending Sync</h3>
                    </div>
                    <p className="text-sm text-amber-800 mb-3">
                      You have {totalPending} item{totalPending !== 1 ? 's' : ''} waiting to sync when you&apos;re back online.
                    </p>
                    <div className="flex gap-2">
                      {offlineCount.albums > 0 && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                          {offlineCount.albums} Album{offlineCount.albums !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {offlineCount.photos > 0 && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                          {offlineCount.photos} Photo{offlineCount.photos !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Available Features */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  What You Can Still Do
                </h3>

                <div className="grid gap-3">
                  {features.map((feature, index) => {
                    const Icon = feature.icon
                    return (
                      <motion.div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          feature.available
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        )}
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        whileHover={prefersReducedMotion ? {} : { x: 4 }}
                      >
                        <motion.div
                          className={cn(
                            "p-2 rounded-lg",
                            feature.available
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-700"
                          )}
                          initial={prefersReducedMotion ? {} : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.9 + index * 0.1, type: 'spring' as const }}
                        >
                          <Icon className="h-4 w-4" />
                        </motion.div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "font-medium text-sm",
                              feature.available ? "text-green-900" : "text-gray-800"
                            )}>
                              {feature.title}
                            </h4>
                            <motion.div
                              initial={prefersReducedMotion ? {} : { scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 1 + index * 0.1, type: 'spring' as const }}
                            >
                              {feature.available ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-gray-700" />
                              )}
                            </motion.div>
                          </div>
                          <p className={cn(
                            "text-sm",
                            feature.available ? "text-green-700" : "text-gray-800"
                          )}>
                            {feature.description}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Tips */}
              <motion.div
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <h3 className="font-semibold text-blue-900 mb-2">Tips while offline:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {[
                    'Your data will automatically sync when reconnected',
                    'Previously viewed content may still be accessible',
                    'Try moving to a different location for better signal',
                    'Check your Wi-Fi or mobile data settings'
                  ].map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + i * 0.05 }}
                    >
                      • {tip}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Navigation */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 pt-4"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
              >
                <motion.div
                  className="flex-1"
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full"
                  >
                    Go Back
                  </Button>
                </motion.div>
                <motion.div
                  className="flex-1"
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                  >
                    Try Dashboard
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connection Help */}
        <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
          <Card className="bg-white/60 backdrop-blur-sm border-0">
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Need help getting back online?</h4>
              <div className="text-sm text-gray-800 space-y-1">
                {[
                  'Check your internet connection',
                  'Restart your router or mobile data',
                  'Move to an area with better signal strength',
                  'Contact your internet service provider if issues persist'
                ].map((help, i) => (
                  <motion.p
                    key={i}
                    initial={prefersReducedMotion ? {} : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 + i * 0.05 }}
                  >
                    • {help}
                  </motion.p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
