/**
 * Offline queue helper (client-side IndexedDB wrapper)
 *
 * Shared persistence layer for offline album/photo creations that need to be
 * synced once connectivity returns. The service worker (`public/sw.js`) reads
 * from and writes to the SAME database/object-store names via raw IndexedDB,
 * so the writer (this module, running in the page) and the reader (the SW)
 * agree on storage.
 *
 * Schema (MUST stay in sync with public/sw.js):
 *   - database: `adventure-log-offline`, version 1
 *   - object stores: `albums` and `photos`, keyPath `id`
 *   - record shape: { id: string, ...payload, queuedAt: number }
 *
 * Dependency-free (raw IndexedDB, no `idb` package). SSR-safe: read/count
 * operations resolve to empty/0 when `indexedDB` is unavailable, and writes
 * reject gracefully.
 */

import { log } from './logger'

export const OFFLINE_DB_NAME = 'adventure-log-offline'
export const OFFLINE_DB_VERSION = 1

export type OfflineStore = 'albums' | 'photos'

const STORES: OfflineStore[] = ['albums', 'photos']

export interface QueuedRecord {
  id: string
  queuedAt: number
  [key: string]: unknown
}

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Open the offline database, creating both object stores in
 * `onupgradeneeded`. Rejects when IndexedDB is unavailable (SSR / unsupported).
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline DB'))
  })
}

/**
 * Add a record to the given queue. Generates an `id` if absent
 * (`crypto.randomUUID()`), stamps `queuedAt`, persists it, and returns the id.
 */
export async function addToQueue(store: OfflineStore, record: object): Promise<string> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available; cannot queue offline data')
  }

  const source = record as Record<string, unknown>
  const id = typeof source.id === 'string' && source.id.length > 0
    ? source.id
    : crypto.randomUUID()

  const entry: QueuedRecord = {
    ...source,
    id,
    queuedAt: Date.now(),
  }

  const db = await openOfflineDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to add to offline queue'))
      tx.onabort = () => reject(tx.error ?? new Error('Offline queue transaction aborted'))
      tx.objectStore(store).put(entry)
    })
  } finally {
    db.close()
  }

  log.debug('Record added to offline queue', {
    component: 'offline-queue',
    action: 'add-to-queue',
    store,
    id,
  })

  return id
}

/**
 * Return all queued records for the given store. Resolves to `[]` when
 * IndexedDB is unavailable.
 */
export async function getQueue(store: OfflineStore): Promise<QueuedRecord[]> {
  if (!isIndexedDBAvailable()) {
    return []
  }

  const db = await openOfflineDB()
  try {
    return await new Promise<QueuedRecord[]>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).getAll()
      request.onsuccess = () => resolve((request.result as QueuedRecord[]) ?? [])
      request.onerror = () => reject(request.error ?? new Error('Failed to read offline queue'))
    })
  } finally {
    db.close()
  }
}

/**
 * Return the number of queued records for the given store. Resolves to `0`
 * when IndexedDB is unavailable.
 */
export async function getQueueCount(store: OfflineStore): Promise<number> {
  if (!isIndexedDBAvailable()) {
    return 0
  }

  const db = await openOfflineDB()
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to count offline queue'))
    })
  } finally {
    db.close()
  }
}

/**
 * Remove a single queued record by id. No-ops when IndexedDB is unavailable.
 */
export async function removeFromQueue(store: OfflineStore, id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return
  }

  const db = await openOfflineDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to remove from offline queue'))
      tx.onabort = () => reject(tx.error ?? new Error('Offline queue transaction aborted'))
      tx.objectStore(store).delete(id)
    })
  } finally {
    db.close()
  }
}

/**
 * Clear all queued records for the given store. No-ops when IndexedDB is
 * unavailable.
 */
export async function clearQueue(store: OfflineStore): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return
  }

  const db = await openOfflineDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear offline queue'))
      tx.onabort = () => reject(tx.error ?? new Error('Offline queue transaction aborted'))
      tx.objectStore(store).clear()
    })
  } finally {
    db.close()
  }
}
