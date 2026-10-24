/* global self, caches, Response */
/* Build embeds a revision and its own cache list. No history, Ask or report responses are cached. */
const CACHE = 'open-scripture-shell-__OFFLINE_VERSION__';
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await (await fetch('/offline-assets.json', { cache: 'no-store' })).json();
      const cache = await caches.open(CACHE);
      await cache.addAll(['/offline', '/icon.svg', '/manifest.webmanifest', ...manifest.assets]);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('open-scripture-shell-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        if (url.pathname !== '/offline')
          return Response.redirect(new URL('/offline', self.location.origin));
        const shell = await (await caches.open(CACHE)).match('/offline');
        return (
          shell ??
          new Response('Open the website online once to prepare offline reading.', { status: 503 })
        );
      }),
    );
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => (await (await caches.open(CACHE)).match(request)) ?? fetch(request))(),
    );
  }
});
