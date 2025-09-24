'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  RefreshCw,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealTimeNotifications } from '@/lib/hooks/useRealTime'

interface AutoRefreshSettingsProps {
  onRefreshIntervalChange: (interval: number | null) => void
  onRealTimeToggle: (enabled: boolean) => void
  currentInterval: number | null
  realTimeEnabled: boolean
  isRefreshing?: boolean
  lastRefresh?: Date
}

const refreshIntervals = [
  { value: null, label: 'Manual Only', description: 'Refresh only when clicked' },
  { value: 30000, label: '30 seconds', description: 'Very frequent updates' },
  { value: 60000, label: '1 minute', description: 'Frequent updates' },
  { value: 300000, label: '5 minutes', description: 'Regular updates' },
  { value: 900000, label: '15 minutes', description: 'Moderate updates' },
  { value: 1800000, label: '30 minutes', description: 'Occasional updates' },
  { value: 3600000, label: '1 hour', description: 'Minimal updates' }
]

export function AutoRefreshSettings({
  onRefreshIntervalChange,
  onRealTimeToggle,
  currentInterval,
  realTimeEnabled,
  isRefreshing = false,
  lastRefresh
}: AutoRefreshSettingsProps) {
  const [open, setOpen] = useState(false)
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null)
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<string>('')

  const {
    notifications,
    unreadCount,
    isConnected: realTimeConnected
  } = useRealTimeNotifications()

  // Calculate next refresh time
  useEffect(() => {
    if (currentInterval && lastRefresh) {
      const next = new Date(lastRefresh.getTime() + currentInterval)
      setNextRefresh(next)
    } else {
      setNextRefresh(null)
    }
  }, [currentInterval, lastRefresh])

  // Update countdown timer
  useEffect(() => {
    if (!nextRefresh) return

    const updateCountdown = () => {
      const now = new Date()
      const diff = nextRefresh.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilRefresh('Refreshing...')
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeUntilRefresh(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [nextRefresh])

  const handleIntervalChange = (value: string) => {
    const interval = value === 'manual' ? null : parseInt(value)
    onRefreshIntervalChange(interval)
  }

  const getCurrentIntervalLabel = () => {
    const config = refreshIntervals.find(config => config.value === currentInterval)
    return config?.label || 'Manual Only'
  }

  const getStatusColor = () => {
    if (realTimeEnabled && realTimeConnected) return 'text-green-600'
    if (currentInterval) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getStatusIcon = () => {
    if (isRefreshing) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (realTimeEnabled && realTimeConnected) return <Wifi className="h-4 w-4" />
    if (realTimeEnabled && !realTimeConnected) return <WifiOff className="h-4 w-4" />
    if (currentInterval) return <Clock className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <div className={cn('flex items-center gap-2', getStatusColor())}>
            {getStatusIcon()}
            <span>{getCurrentIntervalLabel()}</span>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-red-500 text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-Refresh & Real-time Settings
          </DialogTitle>
          <DialogDescription>
            Configure how frequently your analytics data refreshes and enable real-time updates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Real-time Settings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base font-medium">Real-time Updates</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Get instant notifications when your data changes
                </p>
              </div>
              <Switch
                checked={realTimeEnabled}
                onCheckedChange={onRealTimeToggle}
              />
            </div>

            {realTimeEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  {realTimeConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-sm font-medium">
                    {realTimeConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>

                {notifications.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Recent Updates:</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {notifications.slice(0, 3).map((notification) => (
                        <div
                          key={notification.id}
                          className="text-xs p-2 bg-white rounded border flex items-start gap-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{notification.title}</div>
                            <div className="text-gray-600">{notification.message}</div>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <Separator />

          {/* Auto-refresh Settings */}
          <div>
            <div className="mb-4">
              <Label className="text-base font-medium">Auto-refresh Interval</Label>
              <p className="text-sm text-gray-600 mt-1">
                Automatically refresh data at regular intervals
              </p>
            </div>

            <div className="space-y-3">
              <Select
                value={currentInterval?.toString() || 'manual'}
                onValueChange={handleIntervalChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refreshIntervals.map((config) => (
                    <SelectItem
                      key={config.value?.toString() || 'manual'}
                      value={config.value?.toString() || 'manual'}
                    >
                      <div className="flex flex-col">
                        <span>{config.label}</span>
                        <span className="text-xs text-gray-500">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentInterval && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-blue-700 text-sm">
                    <Clock className="h-4 w-4" />
                    <div className="flex-1">
                      {lastRefresh && (
                        <div>
                          <div><strong>Last refresh:</strong> {lastRefresh.toLocaleTimeString()}</div>
                          {nextRefresh && timeUntilRefresh && (
                            <div><strong>Next refresh:</strong> {timeUntilRefresh}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Performance Warning */}
          {(currentInterval && currentInterval < 60000) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-center gap-2 text-yellow-800">
                <Zap className="h-4 w-4" />
                <div>
                  <div className="font-medium">Performance Notice</div>
                  <div className="text-sm">
                    Very frequent refreshes may impact performance and use more data.
                    Consider using real-time updates instead for instant notifications.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Update Method</div>
                <div className="text-gray-600">
                  {realTimeEnabled && realTimeConnected
                    ? 'Real-time + Auto-refresh'
                    : currentInterval
                    ? 'Auto-refresh only'
                    : 'Manual only'
                  }
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Current Status</div>
                <div className="text-gray-600">
                  {isRefreshing
                    ? 'Refreshing...'
                    : realTimeConnected
                    ? 'Connected'
                    : 'Manual'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}