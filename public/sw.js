const CACHE_NAME = 'pedro-hq-v1';
const ASSET_CACHE = 'pedro-hq-assets-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// Install: precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Supabase API → network-first
// - JS/CSS assets → cache-first
// - Navigation → network-first, fallback to cached shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Supabase → network-first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets → cache-first
  if (/\.(js|css|woff2?|png|jpg|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Navigation → network-first, fallback to '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
  }
});
