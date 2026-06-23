/**
 * Offline Sync Manager
 *
 * Syncs offline data with Supabase when connection is restored
 */

import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import {
  getSyncQueue,
  removeFromSyncQueue,
  saveAlbumOffline,
  savePhotoOffline,
  getOfflineStats
} from './storage'
import { Toast } from '@capacitor/toast'
import { Network } from '@capacitor/network'

interface SyncStatus {
  isSyncing: boolean
  syncProgress: number
  totalItems: number
  syncedItems: number
  errors: string[]
}

let syncStatus: SyncStatus = {
  isSyncing: false,
  syncProgress: 0,
  totalItems: 0,
  syncedItems: 0,
  errors: []
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch {
    // Fallback to navigator
    return navigator.onLine
  }
}

/**
 * Sync all offline changes to server
 */
export async function syncOfflineData(): Promise<SyncStatus> {
  if (syncStatus.isSyncing) {
    log.warn('Sync already in progress')
    return syncStatus
  }

  const online = await isOnline()
  if (!online) {
    log.warn('Device is offline, cannot sync')
    return syncStatus
  }

  syncStatus = {
    isSyncing: true,
    syncProgress: 0,
    totalItems: 0,
    syncedItems: 0,
    errors: []
  }

  try {
    const supabase = createClient()
    const queue = await getSyncQueue()
    syncStatus.totalItems = queue.length

    if (queue.length === 0) {
      log.info('No items to sync')
      syncStatus.isSyncing = false
      return syncStatus
    }

    log.info('Starting sync', {
      component: 'offline-sync',
      itemCount: queue.length
    })

    await Toast.show({
      text: `Syncing ${queue.length} items...`,
      duration: 'short',
      position: 'bottom'
    })

    type QueueItem = (typeof queue)[number]

    // Group items by table + action so we can write in BULK (a single request
    // per group) instead of one row at a time.
    const groups = {
      albums: { create: [] as QueueItem[], update: [] as QueueItem[], delete: [] as QueueItem[] },
      photos: { create: [] as QueueItem[], update: [] as QueueItem[], delete: [] as QueueItem[] }
    }
    for (const item of queue) {
      const table = item.type === 'album' ? 'albums' : item.type === 'photo' ? 'photos' : null
      if (table && (item.action === 'create' || item.action === 'update' || item.action === 'delete')) {
        groups[table][item.action].push(item)
      }
    }

    const markSynced = async (items: QueueItem[]) => {
      await Promise.all(items.map(it => removeFromSyncQueue(it.id)))
      syncStatus.syncedItems += items.length
      syncStatus.syncProgress = (syncStatus.syncedItems / syncStatus.totalItems) * 100
    }
    const markFailed = (items: QueueItem[], error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      items.forEach(() => syncStatus.errors.push(msg))
      log.error('Failed to sync batch', {
        component: 'offline-sync',
        table: items[0]?.type,
        count: items.length,
        error: msg
      })
    }

    // Bulk insert, with a per-row fallback so a single bad row doesn't fail the
    // whole batch (preserves the old per-item resilience).
    const bulkCreate = async (table: 'albums' | 'photos', items: QueueItem[]) => {
      if (items.length === 0) return
      const { error } = await supabase.from(table).insert(items.map(i => i.data))
      if (!error) return markSynced(items)
      for (const it of items) {
        const { error: rowError } = await supabase.from(table).insert(it.data)
        if (rowError) markFailed([it], rowError)
        else await markSynced([it])
      }
    }

    // Bulk delete via a single `IN (...)` query, same per-row fallback.
    const bulkDelete = async (table: 'albums' | 'photos', items: QueueItem[]) => {
      if (items.length === 0) return
      const ids = items.map(i => i.data.id)
      const { error } = await supabase.from(table).delete().in('id', ids)
      if (!error) return markSynced(items)
      for (const it of items) {
        const { error: rowError } = await supabase.from(table).delete().eq('id', it.data.id)
        if (rowError) markFailed([it], rowError)
        else await markSynced([it])
      }
    }

    // Updates carry distinct payloads and can't be one statement, but they can
    // run concurrently instead of serially.
    const runUpdates = async (table: 'albums' | 'photos', items: QueueItem[]) => {
      await Promise.all(items.map(async (it) => {
        const { error } = await supabase.from(table).update(it.data).eq('id', it.data.id)
        if (error) markFailed([it], error)
        else await markSynced([it])
      }))
    }

    // Order respects FK constraints: create parents before children,
    // delete children before parents.
    await bulkCreate('albums', groups.albums.create)
    await bulkCreate('photos', groups.photos.create)
    await runUpdates('albums', groups.albums.update)
    await runUpdates('photos', groups.photos.update)
    await bulkDelete('photos', groups.photos.delete)
    await bulkDelete('albums', groups.albums.delete)

    const success = syncStatus.errors.length === 0

    await Toast.show({
      text: success
        ? `Synced ${syncStatus.syncedItems} items successfully!`
        : `Synced ${syncStatus.syncedItems}/${syncStatus.totalItems} items. ${syncStatus.errors.length} failed.`,
      duration: 'long',
      position: 'bottom'
    })

    log.info('Sync completed', {
      component: 'offline-sync',
      synced: syncStatus.syncedItems,
      failed: syncStatus.errors.length
    })

    return syncStatus
  } catch (error) {
    log.error('Sync failed', {
      component: 'offline-sync',
      error
    })

    syncStatus.errors.push(error instanceof Error ? error.message : 'Sync failed')
    return syncStatus
  } finally {
    syncStatus.isSyncing = false
  }
}

/**
 * Setup automatic sync when connection is restored
 */
export function setupAutoSync(): void {
  if (typeof window === 'undefined') return

  // Listen for online event
  window.addEventListener('online', async () => {
    log.info('Network connection restored, starting auto-sync')

    const stats = await getOfflineStats()
    if (stats.syncQueueCount > 0) {
      await syncOfflineData()
    }
  })

  // Capacitor network listener
  Network.addListener('networkStatusChange', async (status) => {
    if (status.connected) {
      log.info('Network connected (Capacitor), starting auto-sync')

      const stats = await getOfflineStats()
      if (stats.syncQueueCount > 0) {
        await syncOfflineData()
      }
    }
  })

  log.info('Auto-sync listeners registered', {
    component: 'offline-sync'
  })
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus }
}

/**
 * Download albums for offline access
 */
export async function downloadAlbumsForOffline(
  albumIds: string[]
): Promise<{ success: number; failed: number }> {
  const supabase = createClient()
  let success = 0
  let failed = 0

  await Toast.show({
    text: `Downloading ${albumIds.length} albums for offline access...`,
    duration: 'short',
    position: 'bottom'
  })

  // Download albums concurrently instead of one after another.
  const results = await Promise.all(albumIds.map(async (albumId) => {
    try {
      // Fetch album and its photos in parallel.
      const [albumRes, photosRes] = await Promise.all([
        supabase.from('albums').select('*').eq('id', albumId).single(),
        supabase.from('photos').select('*').eq('album_id', albumId)
      ])

      if (albumRes.error) throw albumRes.error
      if (photosRes.error) throw photosRes.error

      // Save album + all its photos in parallel.
      await Promise.all([
        saveAlbumOffline(albumRes.data),
        ...(photosRes.data || []).map(photo => savePhotoOffline(photo))
      ])

      log.info('Album downloaded for offline', {
        component: 'offline-sync',
        albumId
      })
      return true
    } catch (error) {
      log.error('Failed to download album', {
        component: 'offline-sync',
        albumId,
        error
      })
      return false
    }
  }))

  success = results.filter(Boolean).length
  failed = results.length - success

  await Toast.show({
    text: `Downloaded ${success} albums for offline access!`,
    duration: 'long',
    position: 'bottom'
  })

  return { success, failed }
}
