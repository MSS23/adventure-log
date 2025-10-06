'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WifiOff, Wifi, RefreshCw, Download, Database } from 'lucide-react'
import { isOnline, syncOfflineData, getSyncStatus, setupAutoSync } from '@/lib/offline/sync'
import { getOfflineStats } from '@/lib/offline/storage'
import { Network } from '@capacitor/network'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  showDetails?: boolean
  className?: string
}

export function OfflineIndicator({ showDetails = false, className }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState({ albumCount: 0, photoCount: 0, syncQueueCount: 0 })

  // Check online status
  useEffect(() => {
    const checkStatus = async () => {
      const status = await isOnline()
      setOnline(status)
    }

    checkStatus()

    // Setup auto-sync
    setupAutoSync()

    // Listen for network changes
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Capacitor network listener
    Network.addListener('networkStatusChange', (status) => {
      setOnline(status.connected)
    }).then(listener => {
      // Store listener for cleanup
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        listener.remove()
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update stats
  useEffect(() => {
    const updateStats = async () => {
      const offlineStats = await getOfflineStats()
      setStats(offlineStats)
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncOfflineData()
      const offlineStats = await getOfflineStats()
      setStats(offlineStats)
    } finally {
      setSyncing(false)
    }
  }

  if (!showDetails) {
    // Compact indicator
    return (
      <Badge
        variant={online ? 'secondary' : 'destructive'}
        className={cn('flex items-center gap-1', className)}
      >
        {online ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
        {stats.syncQueueCount > 0 && (
          <span className="ml-1">({stats.syncQueueCount})</span>
        )}
      </Badge>
    )
  }

  // Detailed view
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {online ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Online</p>
                  <p className="text-sm text-gray-600">Connected to server</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900">Offline Mode</p>
                  <p className="text-sm text-gray-600">Changes will sync when online</p>
                </div>
              </>
            )}
          </div>

          {stats.syncQueueCount > 0 && online && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
              variant="outline"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}
        </div>

        {/* Offline Stats */}
        {(stats.albumCount > 0 || stats.photoCount > 0) && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <Database className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">{stats.albumCount}</p>
              <p className="text-xs text-gray-600">Albums</p>
            </div>
            <div className="text-center">
              <Download className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-sm font-medium text-gray-900">{stats.photoCount}</p>
              <p className="text-xs text-gray-600">Photos</p>
            </div>
            <div className="text-center">
              <RefreshCw className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-sm font-medium text-gray-900">{stats.syncQueueCount}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Simple offline badge for navigation
 */
export function OfflineBadge() {
  const [online, setOnline] = useState(true)
  const [syncQueue, setSyncQueue] = useState(0)

  useEffect(() => {
    const checkStatus = async () => {
      const status = await isOnline()
      setOnline(status)

      const stats = await getOfflineStats()
      setSyncQueue(stats.syncQueueCount)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 3000)

    return () => clearInterval(interval)
  }, [])

  if (online && syncQueue === 0) return null

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}
      {syncQueue > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          {syncQueue} pending
        </Badge>
      )}
    </div>
  )
}
