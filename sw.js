/* Tfarraj Live TV — service worker.
 *
 * Caching policy:
 *  - App shell + static assets (CSS, shared JS, icons, manifest): cache-first.
 *  - HTML navigations and channel config (assets/channels.js): network-first.
 *    The channel URL embeds a signed token that expires in ~30 minutes, so we
 *    MUST re-fetch these from the network to get the freshest token and never
 *    serve a stale cached token. Live video segments are never cached here.
 */
var VERSION = "v9";
var SHELL_CACHE = "tfarraj-shell-" + VERSION;

var PRECACHE = [
  "/",
  "/channel/lb2/",
  "/channel/alhadath/",
  "/assets/app.css",
  "/assets/player.js",
  "/assets/channels.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Always network-first (fresh token / navigation): HTML pages + channel config + data layer.
var ALWAYS_NETWORK_FIRST = ["/channel/", "/assets/channels.js", "/assets/data/channels.js", "/assets/home.js"];

function isNetworkFirst(url) {
  return url.pathname === "/" || ALWAYS_NETWORK_FIRST.some(function (p) {
    return url.pathname.indexOf(p) === 0;
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function () {});
    }).then(function () { self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key.indexOf("tfarraj-shell-") === 0 && key !== SHELL_CACHE; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // Bypass the service worker for cross-origin requests entirely. The live
  // stream (games1.elahmad.store) is cross-origin and must always hit the
  // network — never cache live video.
  if (url.origin !== self.location.origin) return;

  // Ignore non-GET requests.
  if (request.method !== "GET") return;

  // Network-first: fresh token / navigation.
  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(request)
        .then(function (res) {
          // Only cache successful, same-origin responses.
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL_CACHE).then(function (cache) { cache.put(request, copy); });
          }
          return res;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) { return cached || Response.error(); });
        })
    );
    return;
  }

  // Cache-first for static app-shell assets.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (res) {
        // Don't cache opaque/failed responses.
        if (!res || !res.ok || res.status !== 200) return res;
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (cache) { cache.put(request, copy); });
        return res;
      });
    })
  );
});
