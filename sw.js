/* Glassbox Jet — offline shell.

   NETWORK-FIRST, deliberately.

   A cache-first shell is the usual advice and it would be the wrong choice here. This project
   has already lost hours to deploys that appeared not to land, and a service worker happily
   serving yesterday's index.html is indistinguishable from exactly that failure — except it
   also survives a hard reload, so it is worse. Online always wins. The cache only answers when
   the network genuinely cannot.

   What is cached: this app's own same-origin GET responses.
   What is never cached: anything cross-origin, and anything that is not a GET. Model calls are
   cross-origin POSTs to the user's provider, so neither prompts, completions, nor API keys ever
   reach this cache. That is a property of the two guards below, not a promise. */

const CACHE = 'glassbox-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      /* addAll is atomic — one 404 would reject the whole install and leave no worker at all,
         so each file is allowed to fail on its own. */
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                          // never a model call
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;           // provider traffic is not ours

  e.respondWith(
    fetch(req)
      .then(res => {
        /* Opaque and error responses are not worth storing; caching a 500 would serve that 500
           back while offline and look like the app itself is broken. */
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit =>
          hit ||
          /* A navigation to any path should still open the app rather than a browser error. */
          (req.mode === 'navigate' ? caches.match('./index.html') : undefined) ||
          Response.error()
        )
      )
  );
});

/* Lets the page retire a worker without waiting for a reload cycle. */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
