const VERSION = 'v4-2026-06-02';

// Em desenvolvimento (localhost) o SW se auto-destroi imediatamente:
// libera todas as caches antigas e não intercepta nenhuma request.
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

if (IS_DEV) {
  // Instala e ativa imediatamente
  self.addEventListener('install', () => self.skipWaiting());

  // Ao ativar: limpa todas as caches e reivindica controle para poder se desregistrar
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
        .then(() => self.registration.unregister())
    );
  });

  // Não intercepta nada — deixa tudo passar direto para a rede
} else {
  // ─── PRODUÇÃO ────────────────────────────────────────────────────────────────

  const SHELL_CACHE  = `hq-shell-${VERSION}`;
  const ASSETS_CACHE = `hq-assets-${VERSION}`;
  const DATA_CACHE   = `hq-data-${VERSION}`;

  const SHELL_URLS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: 'reload' })))
          .catch(() => {})
      )
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    const keepCaches = new Set([SHELL_CACHE, ASSETS_CACHE, DATA_CACHE]);
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => !keepCaches.has(k)).map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  });

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // Supabase: stale-while-revalidate
    if (url.hostname.includes('supabase.co')) {
      event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
      return;
    }

    // Assets estáticos: cache-first
    if (/\.(js|css|woff2?|png|jpg|svg|ico|webp)(\?|$)/.test(url.pathname)) {
      event.respondWith(cacheFirstWithRefresh(request, ASSETS_CACHE));
      return;
    }

    // Navegações: network-first com timeout
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstWithTimeout(request, 3000));
      return;
    }

    event.respondWith(fetch(request).catch(() => caches.match(request)));
  });

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
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
  }

  async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkPromise = fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    }).catch(() => null);
    return cached || await networkPromise || new Response('{}', { status: 503 });
  }

  async function cacheFirstWithRefresh(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); }).catch(() => {});
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  }
}
