/* Corbeau : mise en cache légère. Toujours la version la plus récente quand il y a internet ;
   la copie en cache ne sert que s'il n'y a pas de connexion. Les données (Supabase) ne sont jamais mises en cache. */
var V = "corbeau-v2";
self.addEventListener("install", function (e) { e.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: "no-cache" }).then(function (res) {
    if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || (r.mode === "navigate" ? caches.match("/") : undefined); }); }));
});
