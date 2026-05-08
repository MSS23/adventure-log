'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import {
  getQueue,
  processQueue,
  subscribe,
  installOfflineQueue,
  type QueuedAction,
} from '@/lib/offline/queue'

export function OfflineQueueIndicator() {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    installOfflineQueue()
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const refresh = async () => {
      const q = await getQueue()
      setQueue(q)
    }
    refresh()

    const unsub = subscribe(refresh)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      unsub()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await processQueue()
    } finally {
      setSyncing(false)
    }
  }

  if (online && queue.length === 0) return null

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-3 py-2 rounded-full shadow-lg cursor-pointer"
      style={{
        background: online ? 'var(--color-gold-tint)' : 'var(--color-coral-tint)',
        border: `1px solid ${online ? 'var(--color-gold)' : 'var(--color-coral)'}`,
        color: online ? 'var(--color-gold)' : 'var(--color-stamp)',
      }}
      onClick={queue.length > 0 && online ? handleSync : undefined}
      role={queue.length > 0 && online ? 'button' : undefined}
      tabIndex={queue.length > 0 && online ? 0 : undefined}
    >
      {syncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : online ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      <span className="text-[12px] font-semibold">
        {!online
          ? 'Offline — changes saved for later'
          : syncing
            ? 'Syncing...'
            : `${queue.length} pending — tap to sync`}
      </span>
    </div>
  )
}
