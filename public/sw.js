/**
 * Service Worker for Adventure Log PWA
 * Provides offline functionality, caching, and background sync
 */

// Bump this version on any deploy that must invalidate stale caches for
// returning visitors. The activate handler deletes every cache whose name
// doesn't match the current set, so changing the suffix purges old content.
const CACHE_VERSION = 'v20'
const CACHE_NAME = `adventure-log-${CACHE_VERSION}`
const STATIC_CACHE = `adventure-log-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `adventure-log-dynamic-${CACHE_VERSION}`
const IMAGE_CACHE = `adventure-log-images-${CACHE_VERSION}`

// Verbose lifecycle logging is gated behind this flag so the service worker is
// quiet in production DevTools. Flip to true when debugging caching/sync under
// Application → Service Workers.
const SW_DEBUG = false
const swLog = (...args) => {
  if (SW_DEBUG) console.log(...args)
}

// Static files to cache immediately
const STATIC_FILES = [
  '/',
  '/offline',
  '/api/manifest',
  '/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
]

// Routes to cache dynamically
const DYNAMIC_ROUTES = [
  '/dashboard',
  '/albums',
  '/globe',
  '/feed',
  '/search',
  '/profile',
  '/passport'
]

// Image file extensions to cache
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

// Cache duration settings (in milliseconds) - optimized for better performance
const CACHE_DURATION = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days (static assets rarely change)
  DYNAMIC: 6 * 60 * 60 * 1000,      // 6 hours (pages can be refreshed)
  IMAGES: 90 * 24 * 60 * 60 * 1000, // 90 days (images don't change)
  API: 2 * 60 * 1000                // 2 minutes (fresher data)
}

// Install event - cache static files
self.addEventListener('install', (event) => {
  swLog('Service Worker: Installing...')

  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        swLog('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      }),

      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  swLog('Service Worker: Activating...')

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== IMAGE_CACHE) {
              swLog('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),

      // Take control of all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Skip non-GET requests and non-HTTP(S) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // IMPORTANT: Never intercept cross-origin requests (Supabase, external APIs)
  // Intercepting these causes CORS failures because the SW strips auth headers
  if (url.origin !== self.location.origin) {
    return
  }

  // Handle different types of requests (same-origin only)
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

// Handle image requests with long-term caching
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // Check if cache is still valid
      const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0)
      const now = new Date()

      if (now - cacheDate < CACHE_DURATION.IMAGES) {
        return cachedResponse
      }
    }

    // Fetch from network
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Clone response for caching - use clone() directly to avoid body stream issues
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    swLog('Service Worker: Image request failed, returning cached version')
    const cached = await caches.match(request)
    return cached || new Response('', { status: 408, statusText: 'Request failed' })
  }
}

// Handle API requests with short-term caching
async function handleAPIRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    swLog('Service Worker: API request failed, checking cache')

    const cache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // Check cache validity
      const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0)
      const now = new Date()

      if (now - cacheDate < CACHE_DURATION.API) {
        return cachedResponse
      }
    }

    throw error
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    return caches.match(request)
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    swLog('Service Worker: Navigation request failed, checking cache')

    // Try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try to match dynamic routes
    for (const route of DYNAMIC_ROUTES) {
      const routeResponse = await caches.match(route)
      if (routeResponse) {
        return routeResponse
      }
    }

    // Fallback to offline page
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }

    // Final fallback
    return new Response('Offline - Please check your internet connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Helper functions
function isImageRequest(request) {
  const url = new URL(request.url)
  return IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().includes(ext))
}

function isAPIRequest(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/api/')
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/_next/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.woff') ||
         url.pathname.includes('.ttf')
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  swLog('Service Worker: Background sync triggered', event.tag)

  if (event.tag === 'background-sync-albums') {
    event.waitUntil(syncOfflineAlbums())
  } else if (event.tag === 'background-sync-photos') {
    event.waitUntil(syncOfflinePhotos())
  }
})

// Sync offline album creations
async function syncOfflineAlbums() {
  try {
    swLog('Service Worker: Syncing offline albums')

    // Get offline data from IndexedDB or localStorage
    const offlineAlbums = await getOfflineData('albums')

    for (const album of offlineAlbums) {
      try {
        // Attempt to sync with server
        const response = await fetch('/api/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(album)
        })

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineData('albums', album.id)

          // Notify clients of successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ALBUM_SYNCED',
                data: album
              })
            })
          })
        }
      } catch (error) {
        swLog('Service Worker: Failed to sync album:', album.id, error)
      }
    }
  } catch (error) {
    swLog('Service Worker: Background sync failed:', error)
  }
}

// Sync offline photo uploads
async function syncOfflinePhotos() {
  try {
    swLog('Service Worker: Syncing offline photos')

    const offlinePhotos = await getOfflineData('photos')

    for (const photo of offlinePhotos) {
      try {
        const formData = new FormData()
        formData.append('file', photo.file)
        formData.append('albumId', photo.albumId)

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          await removeOfflineData('photos', photo.id)

          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'PHOTO_SYNCED',
                data: photo
              })
            })
          })
        }
      } catch (error) {
        swLog('Service Worker: Failed to sync photo:', photo.id, error)
      }
    }
  } catch (error) {
    swLog('Service Worker: Photo sync failed:', error)
  }
}

// Offline data management (IndexedDB)
//
// Uses the SAME database/store names as the client-side helper in
// `src/lib/utils/offline-queue.ts` so the page (writer) and this service
// worker (reader) share storage. A service worker cannot read localStorage,
// so IndexedDB is the only shared option.
//
// Schema (MUST stay in sync with offline-queue.ts):
//   - database: `adventure-log-offline`, version 1
//   - object stores: `albums` and `photos`, keyPath `id`
const OFFLINE_DB_NAME = 'adventure-log-offline'
const OFFLINE_DB_VERSION = 1
const OFFLINE_STORES = ['albums', 'photos']

// Open the offline DB, creating both stores in onupgradeneeded so the SW can
// open it even if it races ahead of the client.
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of OFFLINE_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Failed to open offline DB'))
  })
}

// Return all queued records from the matching store ('albums' | 'photos').
async function getOfflineData(type) {
  try {
    const db = await openOfflineDB()
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(type, 'readonly')
        const req = tx.objectStore(type).getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error || new Error('Failed to read offline data'))
      })
    } finally {
      db.close()
    }
  } catch (error) {
    swLog('Service Worker: Failed to read offline data:', error)
    return []
  }
}

// Delete a record by id from the matching store ('albums' | 'photos').
async function removeOfflineData(type, id) {
  try {
    const db = await openOfflineDB()
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(type, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error || new Error('Failed to remove offline data'))
        tx.onabort = () => reject(tx.error || new Error('Offline data transaction aborted'))
        tx.objectStore(type).delete(id)
      })
    } finally {
      db.close()
    }
    return true
  } catch (error) {
    swLog('Service Worker: Failed to remove offline data:', type, id, error)
    return false
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  swLog('Service Worker: Push notification received')

  let notificationData = {
    title: 'Adventure Log',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'adventure-log-notification'
  }

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() }
    } catch (error) {
      swLog('Service Worker: Failed to parse push data')
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  swLog('Service Worker: Notification clicked')

  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus()
        } else {
          return clients.openWindow('/dashboard')
        }
      })
    )
  }
})

swLog('Service Worker: Loaded and ready')