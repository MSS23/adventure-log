/**
 * Service Worker for Adventure Log PWA
 * Provides offline functionality, caching, and background sync
 */

// AUTO-STAMPED ON DEPLOY: next.config.ts rewrites this line with the commit
// SHA on CI/Vercel builds (see stampServiceWorkerVersion), so every deploy
// invalidates stale caches for returning visitors automatically. The value
// checked in here is only the local-dev fallback — no need to bump it by
// hand. The activate handler deletes every cache whose name doesn't match
// the current set, so any change to this string purges old content.
const CACHE_VERSION = 'v-mrp4tbpt'
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
  '/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
]

// Only these navigation responses are safe to retain between accounts.
const PUBLIC_NAVIGATION_PATHS = new Set([
  '/', '/login', '/signup', '/offline', '/privacy', '/terms', '/cookies', '/dmca', '/contact'
])

// Image file extensions to cache
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

// Cache duration settings (in milliseconds) - optimized for better performance
const CACHE_DURATION = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days (static assets rarely change)
  DYNAMIC: 6 * 60 * 60 * 1000,      // 6 hours (pages can be refreshed)
  IMAGES: 90 * 24 * 60 * 60 * 1000 // 90 days (images don't change)
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

// Store a response with an `sw-cache-date` header so the freshness checks
// below have a real timestamp to compare against. A bare cache.put() keeps
// only the origin's headers — the old code read `sw-cache-date` on the way
// out but never wrote it, so every cached entry looked infinitely stale and
// the image/API caches never served a hit while online.
async function putWithDate(cache, request, response) {
  try {
    const body = await response.arrayBuffer()
    const headers = new Headers(response.headers)
    headers.set('sw-cache-date', new Date().toUTCString())
    await cache.put(
      request,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    )
  } catch (error) {
    // Body already consumed or opaque response — skip caching rather than fail.
    swLog('Service Worker: could not stamp+cache response', error)
  }
}

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
      await putWithDate(cache, request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    swLog('Service Worker: Image request failed, returning cached version')
    const cached = await caches.match(request)
    return cached || new Response('', { status: 408, statusText: 'Request failed' })
  }
}

// API responses can contain account-private data. Cache Storage keys are
// primarily URL-based, so every API request stays network-only.
async function handleAPIRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    swLog('Service Worker: network-only API request failed', error)
    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
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
  const requestUrl = new URL(request.url)
  const isPublicNavigation = PUBLIC_NAVIGATION_PATHS.has(requestUrl.pathname)
  try {
    // Try network first
    const networkResponse = await fetch(request)

    // Chromium recomputes Sec-Fetch-* metadata for fetches issued inside a
    // service worker, so the server-side middleware can misclassify this
    // navigation as a data request and answer a protected page with a JSON
    // 401 instead of its usual 307→/login. Surface the redirect the user
    // expects rather than rendering raw JSON.
    if (networkResponse.status === 401 && request.mode === 'navigate') {
      const url = new URL(request.url)
      return Response.redirect(
        `${url.origin}/login?redirectTo=${encodeURIComponent(url.pathname)}`,
        302,
      )
    }

    if (networkResponse.ok && isPublicNavigation) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    swLog('Service Worker: Navigation request failed, checking cache')

    if (isPublicNavigation) {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
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
  const publicImagePath = url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/twitter-image.png'
  return publicImagePath && IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext))
}

function isAPIRequest(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/api/')
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.woff') ||
         url.pathname.includes('.ttf')
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_PRIVATE_DATA') return
  event.waitUntil(caches.delete(DYNAMIC_CACHE))
})

// Account writes are deliberately not replayed from the service worker. They
// require a live, current Supabase session and the app has no generic album or
// photo-upload endpoints. UI actions fail visibly while offline instead of
// pretending they were queued to endpoints that do not exist.

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

swLog('Service Worker: Loaded and ready')
