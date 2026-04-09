// ═══════════════════════════════════════════════════════════════════
// KATTEGAT ERP — Service Worker v2.0
// Full offline support for production tablets + background sync
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'kattegat-v2';
const STATIC_CACHE = 'kattegat-static-v2';
const API_CACHE = 'kattegat-api-v1';

// Core shell files to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/kattegat_99d-logo-template.jpg',
];

// ─── INSTALL: Precache core shell ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: Clean old caches ───
self.addEventListener('activate', event => {
  const validCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => !validCaches.includes(n)).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: Smart caching strategy ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST to Supabase, etc.)
  if (event.request.method !== 'GET') return;

  // API requests (Supabase): Network first, cache fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (JS, CSS, images): Cache first, network fallback
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation: Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/')))
  );
});

// ─── Background Sync: Queue offline actions ───
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Get queued actions from IndexedDB when back online
  // This will be populated by the app when offline
  try {
    const cache = await caches.open('kattegat-offline-queue');
    const requests = await cache.keys();
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch { /* Still offline, keep in queue */ }
    }
  } catch {}
}

// ─── Push Notifications ───
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'Kattegat ERP', body: 'Nueva notificacion' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kattegat ERP', {
      body: data.body || '',
      icon: '/kattegat_99d-logo-template.jpg',
      badge: '/kattegat_99d-logo-template.jpg',
      tag: data.tag || 'kattegat-notification',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
