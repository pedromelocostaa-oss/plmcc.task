const VERSION = 'v3-2026-05-25';

const SHELL_CACHE  = `hq-shell-${VERSION}`;
const ASSETS_CACHE = `hq-assets-${VERSION}`;
const DATA_CACHE   = `hq-data-${VERSION}`;

const SHELL_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: 'reload' })))
        .catch(() => {/* non-critical if some icons missing */})
    )
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const keepCaches = new Set([SHELL_CACHE, ASSETS_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Message handler ──────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Background sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'hq-flush-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
      })
    );
  }
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // ── Supabase: stale-while-revalidate ──────────────────────────────────────
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // ── Static assets: cache-first with background refresh ───────────────────
  if (/\.(js|css|woff2?|png|jpg|svg|ico|webp)(\?|$)/.test(url.pathname)) {
    event.respondWith(cacheFirstWithRefresh(request, ASSETS_CACHE));
    return;
  }

  // ── Navigations: network-first with 3s timeout, fallback to shell ─────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }

  // ── Everything else: network-first ───────────────────────────────────────
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Strategies ───────────────────────────────────────────────────────────────

async function networkFirstWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    clearTimeout(timeout);
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match('/');
    if (shell) return shell;
    const offline = await caches.match('/offline');
    return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || networkPromise;
}

async function cacheFirstWithRefresh(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  // Trigger background refresh regardless
  fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
  }).catch(() => {});
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
