// Adventure Log Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = "adventure-log-v9";
const OFFLINE_URL = "/offline";

// Assets to cache immediately - simplified URLs matching manifest.json
const STATIC_CACHE_URLS = [
  "/",
  "/offline",
  // Don't cache manifest.json - let it always fetch fresh for icon updates
  // PNG icons (no version parameters - matching manifest.json)
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
  "/icons/apple-icon-180x180.png",
  // SVG icons (existing files only)
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
  "/icons/icon-144x144.svg",
  "/icons/icon-72x72.svg",
  "/icons/icon-96x96.svg",
  "/icons/icon-128x128.svg",
  "/icons/icon-152x152.svg",
  "/icons/icon-384x384.svg",
  "/icons/apple-icon-180x180.svg",
  // Shortcut SVG icons
  "/icons/shortcut-new-album.svg",
  "/icons/shortcut-globe.svg",
  "/icons/shortcut-social.svg",
  // Core app pages
  "/dashboard",
  "/albums",
  "/globe",
  "/social",
  "/auth/signin",
];

// API endpoints to cache with strategies
const API_CACHE_PATTERNS = [
  { pattern: "/api/albums", strategy: "networkFirst" },
  { pattern: "/api/user", strategy: "networkFirst" },
  { pattern: "/api/social", strategy: "networkFirst" },
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") return;

  // Handle different types of requests
  if (url.pathname === "/manifest.json") {
    // Always fetch manifest fresh to avoid icon caching issues
    event.respondWith(fetch(request));
  } else if (url.pathname.startsWith("/api/")) {
    // API requests - Network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/)
  ) {
    // Static assets - Cache first
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - Network first with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Network first strategy for API requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for failed API requests
    return new Response(
      JSON.stringify({ error: "Offline", message: "No network connection" }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Cache first strategy for static assets
async function handleStaticAsset(request) {
  const url = new URL(request.url);

  // Try exact match first
  let cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        }
      })
      .catch(() => {
        // Ignore network errors for background updates
      });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log("[SW] Failed to fetch static asset:", request.url);

    // For PNG icons, try to return a fallback SVG icon if available
    if (url.pathname.includes("/icons/") && url.pathname.includes(".png")) {
      const svgPath = url.pathname.replace(".png", ".svg");
      const svgResponse = await caches.match(url.origin + svgPath);
      if (svgResponse) {
        console.log("[SW] Using SVG fallback for:", request.url);
        return svgResponse;
      }
    }

    return new Response("", { status: 404, statusText: "Asset not found" });
  }
}

// Network first strategy for pages with offline fallback
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);

    // Cache successful page responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return (
      caches.match(OFFLINE_URL) || new Response("Offline", { status: 503 })
    );
  }
}

// Background sync for failed uploads
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") {
    event.waitUntil(syncPhotoUploads());
  }

  if (event.tag === "album-sync") {
    event.waitUntil(syncAlbumData());
  }
});

// Sync failed photo uploads when back online
async function syncPhotoUploads() {
  console.log("[SW] Syncing photo uploads...");

  try {
    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads();

    for (const upload of pendingUploads) {
      try {
        const formData = new FormData();
        formData.append("file", upload.file);
        formData.append("albumId", upload.albumId);
        formData.append("caption", upload.caption || "");

        const response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          await removePendingUpload(upload.id);
          console.log("[SW] Photo uploaded successfully:", upload.id);
        }
      } catch (error) {
        console.error("[SW] Failed to upload photo:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Sync album data when back online
async function syncAlbumData() {
  console.log("[SW] Syncing album data...");

  try {
    // Refresh critical cache entries
    const cache = await caches.open(CACHE_NAME);

    const urlsToRefresh = [
      "/api/albums",
      "/api/user/stats",
      "/api/social/feed",
    ];

    for (const url of urlsToRefresh) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          cache.put(url, response.clone());
        }
      } catch (error) {
        console.log("[SW] Failed to sync:", url);
      }
    }
  } catch (error) {
    console.error("[SW] Album sync failed:", error);
  }
}

// Push notifications for social interactions
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "adventure-log",
    data: data.data,
    actions: [
      {
        action: "view",
        title: "View",
        icon: "/icons/icon-192x192.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "dismiss") {
    return;
  }

  // Default action or 'view' action
  let url = "/";

  if (data && data.url) {
    url = data.url;
  }

  event.waitUntil(clients.openWindow(url));
});

// Utility functions for IndexedDB operations
async function getPendingUploads() {
  // Implementation would use IndexedDB to store pending uploads
  // Return empty array for now
  return [];
}

async function removePendingUpload(id) {
  // Implementation would remove the upload from IndexedDB
  console.log("Removing pending upload:", id);
}

// Message handling for communication with main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log("[SW] Service Worker loaded");
