const STATIC_CACHE = 'urwa-static-v1';
const FONTS_CACHE = 'urwa-fonts-v1';
const PAGES_CACHE = 'urwa-pages-v1';
const VALID_CACHES = new Set([STATIC_CACHE, FONTS_CACHE, PAGES_CACHE, 'urwa-api-cache-v1', 'quran-audio-cache-v1']);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/manifest.json', '/favicon.svg', '/icon-192.png']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !VALID_CACHES.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response('', { status: 504 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match('/');
    return shell || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);

  // Never intercept API proxy routes or external JSON/audio APIs (handled by cacheService / offlineService)
  if (url.pathname.startsWith('/api/')) return;

  // Immutable Google Font binaries (.woff2)
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS_CACHE));
    return;
  }

  // Google Fonts CSS stylesheet
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Hashed Vite assets under /assets/ never change for a given filename
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigations: network-first so deployments apply immediately, cached fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Icons, manifest, SEO files
  if (/\.(png|svg|ico|webp|json|xml|txt)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
