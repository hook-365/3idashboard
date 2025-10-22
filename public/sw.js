/**
 * Service Worker for 3I/ATLAS Comet Dashboard
 * Provides offline capability, caching, and PWA features
 */

const CACHE_NAME = 'comet-dashboard-v2';
const RUNTIME_CACHE = 'comet-runtime-v2';
const API_CACHE = 'comet-api-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/details',
  '/observations',
  '/gallery',
  '/observers',
  '/about',
  '/manifest.json',
  '/favicon.ico',
  '/fonts/inter-var.woff2',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/comet-data',
  '/api/observations',
  '/api/observers',
  '/api/simple-activity',
  '/api/velocity',
  '/api/orbital-velocity',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'no-cache' })));
    }).then(() => {
      console.log('[SW] Static assets cached, skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http protocols
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE, 5 * 60 * 1000) // 5 minute cache
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      cacheFirstStrategy(request, CACHE_NAME)
    );
    return;
  }

  // Handle navigation requests with network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstStrategy(request, RUNTIME_CACHE, 60 * 60 * 1000) // 1 hour cache
    );
    return;
  }

  // Default: network-first with runtime cache
  event.respondWith(
    networkFirstStrategy(request, RUNTIME_CACHE, 30 * 60 * 1000) // 30 minute cache
  );
});

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      // Update cache in background
      fetchAndCache(request, cache);
      return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    // Return offline page if available
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Network-first strategy with timeout
async function networkFirstStrategy(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    // Try network with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);

    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
      console.log('[SW] Network success, cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Check if cache is still fresh
      const cachedDate = cachedResponse.headers.get('date');
      if (cachedDate) {
        const age = Date.now() - new Date(cachedDate).getTime();
        if (age < maxAge) {
          console.log('[SW] Serving from cache (age:', age, 'ms)');
          return cachedResponse;
        }
      }
      // Return stale cache if no network
      console.log('[SW] Serving stale cache');
      return cachedResponse;
    }

    // No cache available
    console.error('[SW] No cache available for:', request.url);
    throw error;
  }
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
      console.log('[SW] Background cache updated:', request.url);
    }
  } catch (error) {
    console.log('[SW] Background fetch failed:', request.url);
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.ico', '.png', '.jpg', '.jpeg', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.json'
  ];

  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Handle background sync for offline data submission
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-observations') {
    event.waitUntil(syncObservations());
  }
});

async function syncObservations() {
  console.log('[SW] Syncing offline observations');
  // Implement sync logic when backend supports it
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New comet update available!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Update',
      },
      {
        action: 'close',
        title: 'Close',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('3I/ATLAS Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/details')
    );
  }
});

// Periodic background sync for fresh data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-comet-data') {
    event.waitUntil(updateCometData());
  }
});

async function updateCometData() {
  console.log('[SW] Periodic sync: updating comet data');
  try {
    const response = await fetch('/api/comet-data?refresh=true');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/comet-data', response);
      console.log('[SW] Comet data updated in background');
    }
  } catch (error) {
    console.error('[SW] Background update failed:', error);
  }
}