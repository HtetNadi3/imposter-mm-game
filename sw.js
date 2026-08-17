const CACHE_NAME = 'imposter-mm-v12';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './imposter_mm.css',
  './manifest.json',
  './alarm.mp3',
  './js/main.js',
  './js/audio.js',
  './js/chat.js',
  './js/control.js',
  './js/data.js',
  './js/dom.js',
  './js/game.js',
  './js/state.js',
  './js/ui.js',
  './js/vote.js',
  './js/net.js',
  './js/online.js',
  './js/online-ui.js',
  './js/online-bridge.js',
  './js/stats.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache same-origin http(s) requests — skip chrome-extension, fonts CDN, etc.
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    })
  );
});
