/**
 * Offline Storage Management
 *
 * IndexedDB-based storage for offline album and photo data
 */

import { log } from '@/lib/utils/logger'
import type { Album, Photo } from '@/types/database'

const DB_NAME = 'adventure_log_offline'
const DB_VERSION = 1

// Store names
const STORES = {
  ALBUMS: 'albums',
  PHOTOS: 'photos',
  PENDING_UPLOADS: 'pending_uploads',
  SYNC_QUEUE: 'sync_queue'
}

interface SyncQueueItem {
  id: string
  action: 'create' | 'update' | 'delete'
  type: 'album' | 'photo'
  data: Record<string, unknown>
  timestamp: number
}

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Albums store
      if (!db.objectStoreNames.contains(STORES.ALBUMS)) {
        const albumStore = db.createObjectStore(STORES.ALBUMS, { keyPath: 'id' })
        albumStore.createIndex('user_id', 'user_id', { unique: false })
        albumStore.createIndex('updated_at', 'updated_at', { unique: false })
      }

      // Photos store
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' })
        photoStore.createIndex('album_id', 'album_id', { unique: false })
        photoStore.createIndex('user_id', 'user_id', { unique: false })
      }

      // Pending uploads store
      if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
        const uploadStore = db.createObjectStore(STORES.PENDING_UPLOADS, { keyPath: 'id' })
        uploadStore.createIndex('timestamp', 'timestamp', { unique: false })
        uploadStore.createIndex('type', 'type', { unique: false })
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        syncStore.createIndex('type', 'type', { unique: false })
      }
    }
  })
}

/**
 * Save album offline
 */
export async function saveAlbumOffline(album: Album): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.ALBUMS], 'readwrite')
    const store = transaction.objectStore(STORES.ALBUMS)

    await new Promise((resolve, reject) => {
      const request = store.put(album)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    log.info('Album saved offline', {
      component: 'offline-storage',
      albumId: album.id
    })
  } catch (error) {
    log.error('Failed to save album offline', { error, albumId: album.id })
    throw error
  }
}

/**
 * Save photo offline
 */
export async function savePhotoOffline(photo: Photo): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.PHOTOS], 'readwrite')
    const store = transaction.objectStore(STORES.PHOTOS)

    await new Promise((resolve, reject) => {
      const request = store.put(photo)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    log.info('Photo saved offline', {
      component: 'offline-storage',
      photoId: photo.id
    })
  } catch (error) {
    log.error('Failed to save photo offline', { error, photoId: photo.id })
    throw error
  }
}

/**
 * Get all offline albums
 */
export async function getOfflineAlbums(userId?: string): Promise<Album[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.ALBUMS], 'readonly')
    const store = transaction.objectStore(STORES.ALBUMS)

    if (userId) {
      const index = store.index('user_id')
      return await new Promise((resolve, reject) => {
        const request = index.getAll(userId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }

    return await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    log.error('Failed to get offline albums', { error })
    return []
  }
}

/**
 * Get album by ID from offline storage
 */
export async function getOfflineAlbum(albumId: string): Promise<Album | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.ALBUMS], 'readonly')
    const store = transaction.objectStore(STORES.ALBUMS)

    return await new Promise((resolve, reject) => {
      const request = store.get(albumId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    log.error('Failed to get offline album', { error, albumId })
    return null
  }
}

/**
 * Get photos for an album from offline storage
 */
export async function getOfflinePhotos(albumId: string): Promise<Photo[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.PHOTOS], 'readonly')
    const store = transaction.objectStore(STORES.PHOTOS)
    const index = store.index('album_id')

    return await new Promise((resolve, reject) => {
      const request = index.getAll(albumId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    log.error('Failed to get offline photos', { error, albumId })
    return []
  }
}

/**
 * Delete album from offline storage
 */
export async function deleteOfflineAlbum(albumId: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.ALBUMS, STORES.PHOTOS], 'readwrite')

    // Delete album
    const albumStore = transaction.objectStore(STORES.ALBUMS)
    await new Promise((resolve, reject) => {
      const request = albumStore.delete(albumId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Delete associated photos
    const photoStore = transaction.objectStore(STORES.PHOTOS)
    const index = photoStore.index('album_id')
    const photos: Photo[] = await new Promise((resolve, reject) => {
      const request = index.getAll(albumId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    for (const photo of photos) {
      await new Promise((resolve, reject) => {
        const request = photoStore.delete(photo.id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }

    log.info('Album deleted offline', {
      component: 'offline-storage',
      albumId
    })
  } catch (error) {
    log.error('Failed to delete offline album', { error, albumId })
    throw error
  }
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  action: 'create' | 'update' | 'delete',
  type: 'album' | 'photo',
  data: Record<string, unknown>
): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    const item: SyncQueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      type,
      data,
      timestamp: Date.now()
    }

    await new Promise((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    log.info('Item added to sync queue', {
      component: 'offline-storage',
      action,
      type
    })
  } catch (error) {
    log.error('Failed to add to sync queue', { error })
    throw error
  }
}

/**
 * Get all items in sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    return await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    log.error('Failed to get sync queue', { error })
    return []
  }
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    await new Promise((resolve, reject) => {
      const request = store.delete(itemId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    log.error('Failed to remove from sync queue', { error, itemId })
    throw error
  }
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(
      [STORES.ALBUMS, STORES.PHOTOS, STORES.PENDING_UPLOADS, STORES.SYNC_QUEUE],
      'readwrite'
    )

    for (const storeName of Object.values(STORES)) {
      const store = transaction.objectStore(storeName)
      await new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }

    log.info('All offline data cleared', {
      component: 'offline-storage'
    })
  } catch (error) {
    log.error('Failed to clear offline data', { error })
    throw error
  }
}

/**
 * Get offline storage stats
 */
export async function getOfflineStats(): Promise<{
  albumCount: number
  photoCount: number
  syncQueueCount: number
}> {
  try {
    const db = await openDB()
    const transaction = db.transaction(
      [STORES.ALBUMS, STORES.PHOTOS, STORES.SYNC_QUEUE],
      'readonly'
    )

    const albumCount = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore(STORES.ALBUMS).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const photoCount = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore(STORES.PHOTOS).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const syncQueueCount = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore(STORES.SYNC_QUEUE).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return { albumCount, photoCount, syncQueueCount }
  } catch (error) {
    log.error('Failed to get offline stats', { error })
    return { albumCount: 0, photoCount: 0, syncQueueCount: 0 }
  }
}
