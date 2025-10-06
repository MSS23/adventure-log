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

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'album':
            if (item.action === 'create') {
              const { error } = await supabase
                .from('albums')
                .insert(item.data)

              if (error) throw error
            } else if (item.action === 'update') {
              const { error } = await supabase
                .from('albums')
                .update(item.data)
                .eq('id', item.data.id)

              if (error) throw error
            } else if (item.action === 'delete') {
              const { error } = await supabase
                .from('albums')
                .delete()
                .eq('id', item.data.id)

              if (error) throw error
            }
            break

          case 'photo':
            if (item.action === 'create') {
              const { error } = await supabase
                .from('photos')
                .insert(item.data)

              if (error) throw error
            } else if (item.action === 'update') {
              const { error } = await supabase
                .from('photos')
                .update(item.data)
                .eq('id', item.data.id)

              if (error) throw error
            } else if (item.action === 'delete') {
              const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', item.data.id)

              if (error) throw error
            }
            break
        }

        // Remove from queue after successful sync
        await removeFromSyncQueue(item.id)
        syncStatus.syncedItems++
        syncStatus.syncProgress = (syncStatus.syncedItems / syncStatus.totalItems) * 100

        log.debug('Item synced', {
          component: 'offline-sync',
          itemId: item.id,
          progress: syncStatus.syncProgress
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        syncStatus.errors.push(errorMessage)

        log.error('Failed to sync item', {
          component: 'offline-sync',
          itemId: item.id,
          error: errorMessage
        })
      }
    }

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

  for (const albumId of albumIds) {
    try {
      // Fetch album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single()

      if (albumError) throw albumError

      // Save album offline
      await saveAlbumOffline(album)

      // Fetch and save photos
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', albumId)

      if (photosError) throw photosError

      for (const photo of photos || []) {
        await savePhotoOffline(photo)
      }

      success++
      log.info('Album downloaded for offline', {
        component: 'offline-sync',
        albumId
      })
    } catch (error) {
      failed++
      log.error('Failed to download album', {
        component: 'offline-sync',
        albumId,
        error
      })
    }
  }

  await Toast.show({
    text: `Downloaded ${success} albums for offline access!`,
    duration: 'long',
    position: 'bottom'
  })

  return { success, failed }
}
