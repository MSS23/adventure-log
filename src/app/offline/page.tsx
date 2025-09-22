'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  WifiOff,
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

export default function OfflinePage() {
  const router = useRouter()
  const { isOnline, connectionType } = useOnlineStatus()
  const { offlineCount, totalPending } = useOfflineData()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

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
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Offline Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <WifiOff className="h-10 w-10 text-white" />
            </div>

            <CardTitle className="text-3xl font-bold text-gray-900">
              You're Offline
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              No internet connection detected. Some features are still available!
            </CardDescription>

            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={cn(
                "w-3 h-3 rounded-full animate-pulse",
                isOnline ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-gray-600">
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
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Try Again
                  </>
                )}
              </Button>

              {retryCount > 0 && !isOnline && (
                <p className="text-sm text-gray-500 mt-2">
                  Attempted {retryCount} time{retryCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Offline Data Status */}
            {totalPending > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Pending Sync</h3>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  You have {totalPending} item{totalPending !== 1 ? 's' : ''} waiting to sync when you're back online.
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
              </div>
            )}

            {/* Available Features */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
                        "flex items-center gap-3 p-3 rounded-lg border",
                        feature.available
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        feature.available
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium text-sm",
                            feature.available ? "text-green-900" : "text-gray-500"
                          )}>
                            {feature.title}
                          </h4>
                          {feature.available ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className={cn(
                          "text-xs",
                          feature.available ? "text-green-700" : "text-gray-500"
                        )}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips while offline:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your data will automatically sync when reconnected</li>
                <li>• Previously viewed content may still be accessible</li>
                <li>• Try moving to a different location for better signal</li>
                <li>• Check your Wi-Fi or mobile data settings</li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Try Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Help */}
        <Card className="bg-white/60 backdrop-blur-sm border-0">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Need help getting back online?</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Check your internet connection</p>
              <p>• Restart your router or mobile data</p>
              <p>• Move to an area with better signal strength</p>
              <p>• Contact your internet service provider if issues persist</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}