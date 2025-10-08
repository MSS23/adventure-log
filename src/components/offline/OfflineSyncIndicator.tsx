/**
 * Offline Sync Indicator Component
 * Shows online/offline status and pending uploads
 */

'use client'

import { useState } from 'react'
import { useOfflineSync } from '@/lib/hooks/useOfflineSync'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineSyncIndicator() {
  const { queueItems, isOnline, isSyncing, syncPendingUploads } = useOfflineSync()
  const [isOpen, setIsOpen] = useState(false)

  const pendingCount = queueItems.filter(item => 
    item.status === 'pending' || item.status === 'failed'
  ).length

  const uploadingCount = queueItems.filter(item => 
    item.status === 'uploading'
  ).length

  const completedCount = queueItems.filter(item => 
    item.status === 'completed'
  ).length

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4" />
    }
    if (isSyncing || uploadingCount > 0) {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }
    if (pendingCount > 0) {
      return <Upload className="h-4 w-4" />
    }
    return <Wifi className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isSyncing) return 'Syncing...'
    if (pendingCount > 0) return `${pendingCount} pending`
    return 'Online'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            !isOnline && "text-destructive",
            pendingCount > 0 && "text-amber-600"
          )}
        >
          {getStatusIcon()}
          <span className="hidden sm:inline">{getStatusText()}</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Cloud className="h-5 w-5 text-green-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h4 className="font-semibold">
                  {isOnline ? 'Connected' : 'Offline Mode'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isOnline 
                    ? 'Your content will sync automatically' 
                    : 'Changes will be uploaded when online'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Queue Status */}
          {queueItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Upload Queue</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncPendingUploads()}
                  disabled={!isOnline || isSyncing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
                  Sync Now
                </Button>
              </div>

              <div className="space-y-2">
                {/* Pending */}
                {pendingCount > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-900">
                        {pendingCount} pending upload{pendingCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Uploading */}
                {uploadingCount > 0 && (
                  <div className="space-y-2">
                    {queueItems
                      .filter(item => item.status === 'uploading')
                      .map(item => (
                        <div key={item.id} className="p-2 rounded-md bg-blue-50 border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-blue-900 font-medium">
                              Uploading {item.resource_type}
                            </span>
                            <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
                          </div>
                          <Progress value={50} className="h-1" />
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Completed */}
                {completedCount > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-900">
                        {completedCount} uploaded
                      </span>
                    </div>
                  </div>
                )}

                {/* Failed */}
                {queueItems.filter(item => item.status === 'failed').length > 0 && (
                  <div className="p-2 rounded-md bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-900">
                        {queueItems.filter(item => item.status === 'failed').length} failed
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No uploads */}
          {queueItems.length === 0 && isOnline && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p>All synced up!</p>
            </div>
          )}

          {/* Offline message */}
          {!isOnline && queueItems.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <CloudOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>You&apos;re offline. Changes will sync when connected.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

