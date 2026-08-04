/* Service worker — makes the app open instantly and work with no signal.
   All data lives in localStorage, so once the shell is cached the app is
   fully usable offline; nothing here touches user data. */

// Bump this on every deploy. The browser byte-compares this file, finds it
// changed, installs the new worker and drops the old cache. Forget to bump it
// and everyone keeps seeing the previous version indefinitely.
const VERSION = 'v2';
const CACHE = `habit-tracker-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/main.js',
  './js/profiles.js',
  './js/seed.js',
  './js/store.js',
  './js/sync.js',
  './js/storage/local.js',
  './js/storage/gist.js',
  './js/lib/date.js',
  './js/lib/id.js',
  './js/lib/merge.js',
  './js/lib/streaks.js',
  './js/lib/month-cursor.js',
  './js/views/profile.js',
  './js/views/today.js',
  './js/views/grid.js',
  './js/views/calendar.js',
  './js/views/day-sheet.js',
  './js/views/habit-editor.js',
  './js/views/month-nav.js',
  './js/views/settings.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Stale-while-revalidate: the cached copy paints immediately and the
      // fresh one lands in the cache for next time. Offline falls back to
      // whatever is cached.
      return cached || fresh;
    })
  );
});
