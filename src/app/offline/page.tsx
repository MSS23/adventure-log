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
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
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
        router.push('/profile')
      }, 1000)
    }
  }, [isOnline, retryCount, router])

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)

    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (navigator.onLine) {
      router.push('/profile')
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
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        className="max-w-2xl w-full space-y-6"
        variants={prefersReducedMotion ? {} : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Offline Card */}
        <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="text-center pb-6">
              {/* Status icon */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AnimatePresence mode="wait">
                  {isOnline ? (
                    <motion.div
                      key="online"
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={prefersReducedMotion ? {} : { scale: 0 }}
                    >
                      <Wifi className="h-8 w-8" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="offline"
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={prefersReducedMotion ? {} : { scale: 0 }}
                    >
                      <WifiOff className="h-8 w-8" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <CardTitle className="al-display text-3xl">
                  {isOnline ? 'Back Online!' : "You're Offline"}
                </CardTitle>
                <CardDescription className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mt-2">
                  {isOnline
                    ? 'Connection restored. Redirecting you back...'
                    : 'No internet connection detected. Some features are still available!'
                  }
                </CardDescription>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    isOnline ? "bg-primary" : "bg-destructive"
                  )}
                  aria-hidden
                />
                <span className="text-xs font-mono tracking-wide text-muted-foreground">
                  {isOnline ? 'Connected' : 'Disconnected'}
                  {connectionType !== 'unknown' && ` • ${connectionType}`}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Retry Section */}
              <div className="text-center">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying || isOnline}
                  size="lg"
                  className="cursor-pointer"
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
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>

                <AnimatePresence>
                  {retryCount > 0 && !isOnline && (
                    <motion.p
                      className="text-sm text-muted-foreground mt-2"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                    >
                      Attempted {retryCount} time{retryCount !== 1 ? 's' : ''}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Offline Data Status */}
              <AnimatePresence>
                {totalPending > 0 && (
                  <motion.div
                    className="rounded-xl bg-muted/50 p-4"
                    initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                    transition={transitions.natural}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="font-heading text-base font-semibold text-foreground">Pending Sync</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      You have {totalPending} item{totalPending !== 1 ? 's' : ''} waiting to sync when you&apos;re back online.
                    </p>
                    <div className="flex gap-2">
                      {offlineCount.albums > 0 && (
                        <Badge variant="secondary">
                          {offlineCount.albums} Album{offlineCount.albums !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {offlineCount.photos > 0 && (
                        <Badge variant="secondary">
                          {offlineCount.photos} Photo{offlineCount.photos !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Available Features */}
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  What You Can Still Do
                </h3>

                <div className="grid gap-3">
                  {features.map((feature, index) => {
                    const Icon = feature.icon
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 rounded-xl p-3",
                          feature.available ? "bg-primary/10" : "bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            feature.available
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-foreground">
                              {feature.title}
                            </h4>
                            {feature.available ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-xl bg-muted/50 p-4">
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">Tips while offline:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {[
                    'Your data will automatically sync when reconnected',
                    'Previously viewed content may still be accessible',
                    'Try moving to a different location for better signal',
                    'Check your Wi-Fi or mobile data settings'
                  ].map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="cursor-pointer flex-1"
                >
                  Go Back
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/profile')}
                  className="cursor-pointer flex-1"
                >
                  Try Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connection Help */}
        <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-heading text-base font-semibold text-foreground mb-2">Need help getting back online?</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {[
                  'Check your internet connection',
                  'Restart your router or mobile data',
                  'Move to an area with better signal strength',
                  'Contact your internet service provider if issues persist'
                ].map((help, i) => (
                  <p key={i}>• {help}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
