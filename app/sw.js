/* Fusion Hörproben – Service Worker für Offline-Nutzung.
 * Seite (Navigation): erst Netz (immer aktuell), bei Offline aus dem Cache.
 * Statische Dateien (Icons/Fonts/Manifest): erst Cache, sonst Netz.
 * SoundCloud/YouTube brauchen Netz und schlagen offline einfach fehl. */
var CACHE = "fusion-hp-v18";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./appfont-500.woff2",
  "./appfont-700.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // SoundCloud/YouTube/Fonts-CDN: Netz, nicht cachen

  // Navigation (die HTML-Seite): erst Netz, dann Cache-Fallback
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (h) { return h || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Statische Dateien: erst Cache, sonst Netz (und dann cachen)
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
